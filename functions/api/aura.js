const AWARD_AMOUNT = 100;
const MAX_SCORE = 1_000_000_000;

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      ...extraHeaders,
    },
  });
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizedNameKey(name) {
  return normalizeName(name).toLocaleLowerCase("de-DE");
}

function isValidName(name) {
  return name.length >= 2
    && name.length <= 18
    && /^[\p{L}\p{N} _.-]+$/u.test(name);
}

function isValidPlayerId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,80}$/.test(value);
}

function publicPlayer(player, currentPlayerId = "") {
  if (!player) return null;
  return {
    name: String(player.name || ""),
    score: Math.max(0, Number(player.score) || 0),
    isCurrent: Boolean(currentPlayerId && player.player_id === currentPlayerId),
  };
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS aura_players (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL DEFAULT 0,
        last_award_at INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `),
    db.prepare(`
      CREATE INDEX IF NOT EXISTS aura_ranking
      ON aura_players (score DESC, updated_at ASC, name ASC)
    `),
  ]);
}

async function readPlayer(db, playerId) {
  if (!isValidPlayerId(playerId)) return null;
  return db.prepare(`
    SELECT player_id, name, score, last_award_at, updated_at
    FROM aura_players
    WHERE player_id = ?1
    LIMIT 1
  `).bind(playerId).first();
}

async function readLeaderboard(db, currentPlayerId = "") {
  const result = await db.prepare(`
    SELECT player_id, name, score
    FROM aura_players
    ORDER BY score DESC, updated_at ASC, name COLLATE NOCASE ASC
    LIMIT 10
  `).all();

  return (result.results || []).map((player) => publicPlayer(player, currentPlayerId));
}

async function createPlayer(db, playerId, name, now) {
  try {
    await db.prepare(`
      INSERT INTO aura_players (
        player_id, name, normalized_name, score,
        last_award_at, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?5, ?5)
    `).bind(
      playerId,
      name,
      normalizedNameKey(name),
      AWARD_AMOUNT,
      now,
    ).run();

    return { player: await readPlayer(db, playerId), awarded: AWARD_AMOUNT };
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (/unique|constraint/i.test(message)) {
      const samePlayer = await readPlayer(db, playerId);
      if (samePlayer) return { player: samePlayer, retryExisting: true };
      return {
        error: "Dieser Name ist bereits vergeben.",
        code: "NAME_TAKEN",
        status: 409,
      };
    }
    throw error;
  }
}

async function awardExistingPlayer(db, player, now) {
  const result = await db.prepare(`
    UPDATE aura_players
    SET
      score = MIN(?1, score + ?2),
      last_award_at = ?3,
      updated_at = ?3
    WHERE player_id = ?4
  `).bind(
    MAX_SCORE,
    AWARD_AMOUNT,
    now,
    player.player_id,
  ).run();

  if (!result.success || Number(result.meta && result.meta.changes) < 1) {
    return {
      error: "Das Aura-Profil konnte nicht aktualisiert werden.",
      code: "PLAYER_NOT_FOUND",
      status: 404,
    };
  }

  return { player: await readPlayer(db, player.player_id), awarded: AWARD_AMOUNT };
}

async function awardAura(db, playerId, requestedName) {
  const now = Date.now();
  let player = await readPlayer(db, playerId);

  if (!player) {
    const created = await createPlayer(db, playerId, requestedName, now);
    if (created.error) return created;
    if (!created.retryExisting) return created;
    player = created.player;
  }

  return awardExistingPlayer(db, player, now);
}

async function handleAuraRequest(request, env) {
  try {
    if (!env.DB) {
      return json({
        error: 'Cloudflare D1 ist noch nicht verbunden. Lege ein D1-Binding mit dem Variablennamen "DB" an und veröffentliche das Projekt erneut.',
        code: "DB_BINDING_MISSING",
      }, 503);
    }

    await ensureSchema(env.DB);

    if (request.method === "GET" || request.method === "HEAD") {
      const url = new URL(request.url);
      const currentPlayerId = url.searchParams.get("playerId") || "";
      const currentPlayer = isValidPlayerId(currentPlayerId)
        ? await readPlayer(env.DB, currentPlayerId)
        : null;
      const payload = {
        player: publicPlayer(currentPlayer, currentPlayerId),
        leaderboard: await readLeaderboard(env.DB, currentPlayerId),
      };
      return request.method === "HEAD" ? new Response(null, { status: 200 }) : json(payload);
    }

    if (request.method !== "POST") {
      return json({ error: "Methode nicht erlaubt." }, 405, { allow: "GET, HEAD, POST" });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Ungültige JSON-Anfrage." }, 400);
    }

    if (body?.action !== "award") {
      return json({ error: "Unbekannte Aura-Aktion." }, 400);
    }

    const playerId = String(body.playerId || "");
    const name = normalizeName(body.name);
    if (!isValidPlayerId(playerId)) return json({ error: "Ungültige Browser-ID." }, 400);
    if (!isValidName(name)) return json({ error: "Der Name muss 2–18 gültige Zeichen enthalten." }, 400);

    const result = await awardAura(env.DB, playerId, name);
    if (result.error) {
      return json({
        error: result.error,
        code: result.code,
        retryAfterMs: result.retryAfterMs,
      }, result.status || 400);
    }

    return json({
      awarded: result.awarded || AWARD_AMOUNT,
      player: publicPlayer(result.player, playerId),
      leaderboard: await readLeaderboard(env.DB, playerId),
    });
  } catch (error) {
    console.error("Aura API error", error);
    return json({ error: "Der Aura-Server ist gerade nicht erreichbar." }, 500);
  }
}

export async function onRequest(context) {
  return handleAuraRequest(context.request, context.env);
}

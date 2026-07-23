const AWARD_AMOUNT = 100;
const MAX_SCORE = 1_000_000_000;
const ALLOWED_UNLOCK_BADGES = new Set(["capybara_hunter"]);

const BADGES = {
  aura_king: { label: "Aura König", icon: "👑", description: "Aktueller Platz 1 der Aura-Rangliste.", tone: "gold" },
  aura_challenger: { label: "Aura Herausforderer", icon: "⚔️", description: "Aktueller Platz 2 der Aura-Rangliste.", tone: "silver" },
  aura_legend: { label: "Aura Legende", icon: "🥉", description: "Aktueller Platz 3 der Aura-Rangliste.", tone: "bronze" },
  founder: { label: "Founder", icon: "💎", description: "Von Anfang an Teil des Projekts.", tone: "cyan" },
  owner: { label: "Owner", icon: "👑", description: "Owner der Die-Bwes-Community.", tone: "gold" },
  developer: { label: "Developer", icon: "🛠", description: "Entwickelt Website, Systeme oder Server.", tone: "blue" },
  supporter: { label: "Supporter", icon: "💜", description: "Unterstützt die Community besonders.", tone: "pink" },
  og_player: { label: "OG Player", icon: "🎮", description: "Frühes Mitglied der Aura-Rangliste.", tone: "gray" },
  capybara_hunter: { label: "Capybara Hunter", icon: "🐹", description: "Hat alle versteckten Capybaras gefunden.", tone: "green" },
  aura_addict: { label: "Aura Addict", icon: "🔥", description: "Mindestens 1.000 Aura gesammelt.", tone: "orange" },
  aura_lord: { label: "Aura Lord", icon: "⚡", description: "Mindestens 10.000 Aura gesammelt.", tone: "violet" },
  aura_titan: { label: "Aura Titan", icon: "☄️", description: "Mindestens 50.000 Aura gesammelt.", tone: "red" },
  aura_god: { label: "Aura Gott", icon: "🌌", description: "Mindestens 100.000 Aura gesammelt.", tone: "cosmic" },
  aura_millionaire: { label: "Aura Millionär", icon: "💠", description: "Zwischen 1 und 4,99 Millionen Aura gesammelt.", tone: "diamond" },
  aura_multimillionaire: { label: "Aura Multimillionär", icon: "💚", description: "Zwischen 5 und 9,99 Millionen Aura gesammelt.", tone: "emerald" },
  aura_superstar: { label: "Aura Superstar", icon: "🔷", description: "Zwischen 10 und 24,99 Millionen Aura gesammelt.", tone: "sapphire" },
  aura_overstar: { label: "Aura Überstar", icon: "💜", description: "Zwischen 25 und 49,99 Millionen Aura gesammelt.", tone: "magenta" },
  aura_mythos: { label: "Aura Mythos", icon: "🌠", description: "Mindestens 50 Millionen Aura gesammelt.", tone: "radiant" },
  special_67: { label: "67", icon: "🫪", display: "67 🫪", description: "Die Ziffern 6 und 7 stehen im Aura-Stand direkt hintereinander. Überschreibt vorübergehend alle anderen Badges.", tone: "sixtyseven" },
};

// Manuelle Badges werden hier über den normalisierten Anzeigenamen vergeben.
const MANUAL_BADGES_BY_NAME = new Map([
  ["thegao dan", ["owner", "founder", "developer", "og_player"]],
  ["thegao_dan", ["owner", "founder", "developer", "og_player"]],
]);

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
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

function normalizedNameKey(name) {
  return normalizeName(name).toLocaleLowerCase("de-DE");
}

function isValidName(name) {
  return name.length >= 2 && name.length <= 18 && /^[\p{L}\p{N} _.-]+$/u.test(name);
}

function isValidPlayerId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{16,80}$/.test(value);
}

function parseStoredBadges(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.filter((badge) => typeof badge === "string" && BADGES[badge]) : [];
  } catch {
    return [];
  }
}

function badgeObject(id) {
  return BADGES[id] ? { id, ...BADGES[id] } : null;
}

function badgeIdsForPlayer(player, rank = 0) {
  const score = Math.max(0, Math.trunc(Number(player.score) || 0));

  // Der 67-Badge ist exklusiv: Sobald die ungepunktete Zahl irgendwo "67"
  // enthält, wird ausschließlich dieser Badge angezeigt, unabhängig von Rang,
  // Millionenstufe oder manuell vergebenen Badges.
  if (String(score).includes("67")) return ["special_67"];

  const ids = new Set(parseStoredBadges(player.unlocked_badges));
  const manual = MANUAL_BADGES_BY_NAME.get(normalizedNameKey(player.name)) || [];
  manual.forEach((id) => ids.add(id));

  if (score >= 1_000) ids.add("aura_addict");
  if (score >= 10_000) ids.add("aura_lord");
  if (score >= 50_000) ids.add("aura_titan");
  if (score >= 100_000) ids.add("aura_god");

  // Von den Millionen-Badges wird immer nur die aktuell höchste Stufe gezeigt.
  if (score >= 50_000_000) ids.add("aura_mythos");
  else if (score >= 25_000_000) ids.add("aura_overstar");
  else if (score >= 10_000_000) ids.add("aura_superstar");
  else if (score >= 5_000_000) ids.add("aura_multimillionaire");
  else if (score >= 1_000_000) ids.add("aura_millionaire");

  if (rank === 1) ids.add("aura_king");
  if (rank === 2) ids.add("aura_challenger");
  if (rank === 3) ids.add("aura_legend");
  return [...ids];
}

function publicPlayer(player, currentPlayerId = "", rank = 0) {
  if (!player) return null;
  return {
    name: String(player.name || ""),
    score: Math.max(0, Number(player.score) || 0),
    clicks: Math.max(0, Number(player.clicks) || 0),
    rank: Math.max(0, Number(rank) || 0),
    createdAt: Math.max(0, Number(player.created_at) || 0),
    badges: badgeIdsForPlayer(player, rank).map(badgeObject).filter(Boolean),
    isCurrent: Boolean(currentPlayerId && player.player_id === currentPlayerId),
  };
}

async function addColumnIfMissing(db, sql) {
  try { await db.prepare(sql).run(); } catch (error) {
    if (!/duplicate column/i.test(String(error && error.message ? error.message : error))) throw error;
  }
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS aura_players (
        player_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL UNIQUE,
        score INTEGER NOT NULL DEFAULT 0,
        clicks INTEGER NOT NULL DEFAULT 0,
        unlocked_badges TEXT NOT NULL DEFAULT '[]',
        last_award_at INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `),
    db.prepare(`CREATE INDEX IF NOT EXISTS aura_ranking ON aura_players (score DESC, updated_at ASC, name ASC)`),
  ]);
  await addColumnIfMissing(db, "ALTER TABLE aura_players ADD COLUMN clicks INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(db, "ALTER TABLE aura_players ADD COLUMN unlocked_badges TEXT NOT NULL DEFAULT '[]'");
}

async function readPlayer(db, playerId) {
  if (!isValidPlayerId(playerId)) return null;
  return db.prepare(`
    SELECT player_id, name, score, clicks, unlocked_badges, last_award_at, created_at, updated_at
    FROM aura_players WHERE player_id = ?1 LIMIT 1
  `).bind(playerId).first();
}

async function readLeaderboard(db, currentPlayerId = "") {
  const result = await db.prepare(`
    SELECT player_id, name, score, clicks, unlocked_badges, created_at, updated_at
    FROM aura_players
    ORDER BY score DESC, updated_at ASC, name COLLATE NOCASE ASC
  `).all();
  return (result.results || []).map((player, index) => publicPlayer(player, currentPlayerId, index + 1));
}

async function readPublicCurrentPlayer(db, playerId) {
  const player = await readPlayer(db, playerId);
  if (!player) return null;
  const rankRow = await db.prepare(`
    SELECT COUNT(*) + 1 AS rank
    FROM aura_players
    WHERE score > ?1 OR (score = ?1 AND (updated_at < ?2 OR (updated_at = ?2 AND name COLLATE NOCASE < ?3 COLLATE NOCASE)))
  `).bind(player.score, player.updated_at, player.name).first();
  return publicPlayer(player, playerId, Number(rankRow && rankRow.rank) || 0);
}

async function createPlayer(db, playerId, name, now) {
  try {
    await db.prepare(`
      INSERT INTO aura_players (
        player_id, name, normalized_name, score, clicks, unlocked_badges,
        last_award_at, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, 1, '[]', ?5, ?5, ?5)
    `).bind(playerId, name, normalizedNameKey(name), AWARD_AMOUNT, now).run();
    return { player: await readPlayer(db, playerId), awarded: AWARD_AMOUNT };
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    if (/unique|constraint/i.test(message)) {
      const samePlayer = await readPlayer(db, playerId);
      if (samePlayer) return { player: samePlayer, retryExisting: true };
      return { error: "Dieser Name ist bereits vergeben.", code: "NAME_TAKEN", status: 409 };
    }
    throw error;
  }
}

async function awardExistingPlayer(db, player, now) {
  const result = await db.prepare(`
    UPDATE aura_players
    SET score = MIN(?1, score + ?2), clicks = clicks + 1, last_award_at = ?3, updated_at = ?3
    WHERE player_id = ?4
  `).bind(MAX_SCORE, AWARD_AMOUNT, now, player.player_id).run();
  if (!result.success || Number(result.meta && result.meta.changes) < 1) {
    return { error: "Das Aura-Profil konnte nicht aktualisiert werden.", code: "PLAYER_NOT_FOUND", status: 404 };
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

async function unlockBadge(db, playerId, badgeId) {
  if (!ALLOWED_UNLOCK_BADGES.has(badgeId)) return { error: "Dieser Badge kann nicht so freigeschaltet werden.", status: 400 };
  const player = await readPlayer(db, playerId);
  if (!player) return { error: "Erstelle zuerst dein Aura-Profil.", status: 404 };
  const badges = new Set(parseStoredBadges(player.unlocked_badges));
  badges.add(badgeId);
  await db.prepare(`UPDATE aura_players SET unlocked_badges = ?1, updated_at = ?2 WHERE player_id = ?3`)
    .bind(JSON.stringify([...badges]), Date.now(), playerId).run();
  return { player: await readPlayer(db, playerId) };
}

async function handleAuraRequest(request, env) {
  try {
    if (!env.DB) return json({ error: 'Cloudflare D1 ist noch nicht verbunden. Lege ein D1-Binding mit dem Variablennamen "DB" an und veröffentliche das Projekt erneut.', code: "DB_BINDING_MISSING" }, 503);
    await ensureSchema(env.DB);

    if (request.method === "GET" || request.method === "HEAD") {
      const url = new URL(request.url);
      const currentPlayerId = url.searchParams.get("playerId") || "";
      const payload = {
        player: isValidPlayerId(currentPlayerId) ? await readPublicCurrentPlayer(env.DB, currentPlayerId) : null,
        leaderboard: await readLeaderboard(env.DB, currentPlayerId),
      };
      return request.method === "HEAD" ? new Response(null, { status: 200 }) : json(payload);
    }

    if (request.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405, { allow: "GET, HEAD, POST" });
    let body;
    try { body = await request.json(); } catch { return json({ error: "Ungültige JSON-Anfrage." }, 400); }

    const playerId = String(body.playerId || "");
    if (!isValidPlayerId(playerId)) return json({ error: "Ungültige Browser-ID." }, 400);

    if (body.action === "unlockBadge") {
      const result = await unlockBadge(env.DB, playerId, String(body.badgeId || ""));
      if (result.error) return json({ error: result.error }, result.status || 400);
      return json({ player: await readPublicCurrentPlayer(env.DB, playerId), leaderboard: await readLeaderboard(env.DB, playerId) });
    }

    if (body.action !== "award") return json({ error: "Unbekannte Aura-Aktion." }, 400);
    const name = normalizeName(body.name);
    if (!isValidName(name)) return json({ error: "Der Name muss 2–18 gültige Zeichen enthalten." }, 400);

    const result = await awardAura(env.DB, playerId, name);
    if (result.error) return json({ error: result.error, code: result.code }, result.status || 400);

    return json({
      awarded: result.awarded || AWARD_AMOUNT,
      player: await readPublicCurrentPlayer(env.DB, playerId),
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

(function () {
  "use strict";

  const config = window.COMMUNITY_CONFIG || {};
  const allowedAccents = new Set(["violet", "cyan", "pink", "green", "amber", "blue"]);
  const allowedStatuses = new Set(["online", "offline", "maintenance", "checking", "unknown"]);

  const carousel = {
    track: null,
    slider: null,
    previous: null,
    next: null,
    scrollFrame: 0
  };

  let orbitNavigationReady = false;

  const auraStorageKeys = {
    playerId: "bwesAuraPlayerId",
    playerName: "bwesAuraPlayerName",
    score: "bwesAuraScore",
    capybaras: "bwesFoundCapybaras"
  };

  const auraState = {
    playerId: "",
    playerName: "",
    score: 0,
    confirmedScore: 0,
    pendingAwards: 0,
    processingAwards: false,
    requestingName: false,
    nameResolver: null,
    refreshTimer: 0,
    clicks: 0,
    badges: [],
    foundCapybaras: new Set()
  };

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function normalizeServer(server) {
    const comingSoon = server.comingSoon === true;
    const maxPlayers = Math.max(0, Number(server.maxPlayers) || 0);
    const players = Math.min(maxPlayers || Number.MAX_SAFE_INTEGER, Math.max(0, Number(server.players) || 0));

    return {
      ...server,
      comingSoon,
      title: String(server.title || (comingSoon ? "Comming Soon" : "Game Server")),
      shortTitle: String(server.shortTitle || server.title || (comingSoon ? "Neuer Server" : "Server")),
      game: String(server.game || "Game Server"),
      description: String(server.description || ""),
      image: String(server.image || ""),
      status: allowedStatuses.has(server.status) ? server.status : "offline",
      players,
      maxPlayers,
      map: String(server.map || "Unbekannte Welt"),
      address: server.address == null ? "" : String(server.address),
      version: String(server.version || ""),
      versionLabel: String(server.versionLabel || "Version"),
      modpackUrl: String(server.modpackUrl || ""),
      modpackLabel: String(server.modpackLabel || "Modpack öffnen"),
      joinUrl: String(server.joinUrl || ""),
      tags: Array.isArray(server.tags) ? server.tags.slice(0, 4).map(String) : [],
      accent: allowedAccents.has(server.accent) ? server.accent : "violet"
    };
  }

  function statusLabel(status) {
    if (status === "online") return "Online";
    if (status === "maintenance") return "Wartung";
    if (status === "checking") return "Prüfe Status";
    if (status === "unknown") return "Status unbekannt";
    return "Offline";
  }

  function createComingSoonCard(server) {
    const article = document.createElement("article");
    article.className = `game-server-card coming-soon-card accent-${server.accent}`;
    article.setAttribute("aria-label", `${server.title}, neuer Game Server folgt`);

    const visual = document.createElement("div");
    visual.className = "coming-soon-visual";

    const slot = textElement("span", "coming-soon-slot", server.shortTitle);
    const logo = document.createElement("img");
    logo.className = "coming-soon-logo";
    logo.src = "/assets/diebwes-logo.png";
    logo.alt = "";
    logo.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = "coming-soon-content";
    content.appendChild(textElement("span", "coming-soon-kicker", "Neue Spielwelt"));
    content.appendChild(textElement("h3", "", server.title));
    content.appendChild(textElement("p", "", "Dieser Serverplatz wartet noch auf sein nächstes Abenteuer."));

    const signal = document.createElement("div");
    signal.className = "coming-soon-signal";
    for (let index = 0; index < 5; index += 1) {
      signal.appendChild(textElement("span", "", ""));
    }

    visual.appendChild(slot);
    visual.appendChild(logo);
    visual.appendChild(content);
    visual.appendChild(signal);
    article.appendChild(visual);
    return article;
  }

  function createServerCard(server) {
    if (server.comingSoon) return createComingSoonCard(server);

    const article = document.createElement("article");
    article.className = `game-server-card accent-${server.accent} status-${server.status}`;

    const visual = document.createElement("div");
    visual.className = "server-card-visual";
    if (server.image) {
      visual.style.backgroundImage = `linear-gradient(180deg, rgba(7, 9, 18, 0.02), rgba(7, 9, 18, 0.98)), url("${server.image.replace(/"/g, "%22")}")`;
    }

    const status = textElement("span", "server-live-badge", statusLabel(server.status));
    status.prepend(textElement("span", "server-live-dot", ""));
    visual.appendChild(status);

    const visualTitle = document.createElement("div");
    visualTitle.className = "server-visual-title";
    visualTitle.appendChild(textElement("span", "server-game-label", server.game));
    visualTitle.appendChild(textElement("h3", "", server.title));
    visual.appendChild(visualTitle);
    article.appendChild(visual);

    const body = document.createElement("div");
    body.className = "server-card-body";
    body.appendChild(textElement("p", "server-card-description", server.description));

    const tags = document.createElement("div");
    tags.className = "server-tags";
    server.tags.forEach(function (tag) {
      tags.appendChild(textElement("span", "", tag));
    });
    body.appendChild(tags);

    const playerRow = document.createElement("div");
    playerRow.className = "player-row";
    playerRow.appendChild(textElement("span", "", "Spieler"));
    const playerText = server.status === "checking"
      ? "Wird geladen …"
      : server.status === "unknown"
        ? "Nicht verfügbar"
        : `${server.players} / ${server.maxPlayers || "–"}`;
    playerRow.appendChild(textElement("strong", "", playerText));
    body.appendChild(playerRow);

    const playerTrack = document.createElement("div");
    playerTrack.className = "player-track";
    const playerFill = document.createElement("span");
    const percent = server.status === "online" && server.maxPlayers
      ? Math.min(100, (server.players / server.maxPlayers) * 100)
      : 0;
    playerFill.style.width = `${percent}%`;
    playerTrack.appendChild(playerFill);
    body.appendChild(playerTrack);

    const details = document.createElement("dl");
    details.className = "server-details";
    if (server.version) {
      details.appendChild(textElement("dt", "", server.versionLabel));
      details.appendChild(textElement("dd", "server-version", server.version));
    }
    if (server.map) {
      details.appendChild(textElement("dt", "", "Welt / Map"));
      details.appendChild(textElement("dd", "", server.map));
    }
    if (server.address) {
      details.appendChild(textElement("dt", "", "Adresse"));
      details.appendChild(textElement("dd", "server-address", server.address));
    }
    body.appendChild(details);

    const actions = document.createElement("div");
    actions.className = "server-card-actions";

    if (server.modpackUrl) {
      const modpackLink = document.createElement("a");
      modpackLink.className = "button modpack-download-button";
      modpackLink.href = server.modpackUrl;
      modpackLink.target = "_blank";
      modpackLink.rel = "noopener noreferrer";
      modpackLink.textContent = server.modpackLabel;
      actions.appendChild(modpackLink);
    }

    if (server.joinUrl && server.status === "online") {
      const join = document.createElement("a");
      join.className = "button server-join-button";
      join.href = server.joinUrl;
      join.textContent = "Jetzt verbinden";
      actions.appendChild(join);
    } else {
      const unavailable = textElement(
        "span",
        "server-unavailable",
        server.status === "maintenance"
          ? "Bald wieder da"
          : server.status === "checking"
            ? "Status wird geprüft"
            : server.status === "unknown"
              ? "Status nicht verfügbar"
              : "Derzeit nicht erreichbar"
      );
      actions.appendChild(unavailable);
    }

    if (server.address) {
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "copy-address-button";
      copyButton.textContent = "Adresse kopieren";
      copyButton.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(server.address);
          copyButton.textContent = "Kopiert ✓";
        } catch (error) {
          copyButton.textContent = server.address;
        }
        window.setTimeout(function () {
          copyButton.textContent = "Adresse kopieren";
        }, 1800);
      });
      actions.appendChild(copyButton);
    }

    body.appendChild(actions);
    article.appendChild(body);
    return article;
  }

  function focusServerCard(serverIndex) {
    const section = document.getElementById("server");
    const track = document.getElementById("game-server-grid");
    const cards = track ? Array.from(track.querySelectorAll(".game-server-card")) : [];
    const target = cards[serverIndex];
    if (!section || !track || !target) return;

    section.scrollIntoView({ behavior: "smooth", block: "start" });

    window.setTimeout(function () {
      const targetLeft = target.offsetLeft - Math.max(0, (track.clientWidth - target.offsetWidth) / 2);
      track.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
      target.classList.add("server-card-highlight");

      window.setTimeout(function () {
        target.classList.remove("server-card-highlight");
      }, 1800);
    }, 340);
  }

  function setupOrbitNavigation(servers) {
    const nodes = Array.from(document.querySelectorAll(".orbit-node[data-server-index]"));
    const featuredServers = realServers(servers).slice(0, 4);

    nodes.forEach(function (node, nodeIndex) {
      const server = featuredServers[nodeIndex];
      node.hidden = !server;
      if (!server) return;

      node.setAttribute("aria-label", `Zu ${server.title} springen`);
      node.title = server.shortTitle;
      node.style.setProperty("--node-label", `"${server.shortTitle.replace(/"/g, "\\\"")}"`);

      if (!orbitNavigationReady) {
        node.addEventListener("click", function () {
          focusServerCard(Number(node.dataset.serverIndex) || 0);
        });
      }
    });

    orbitNavigationReady = true;
  }

  function realServers(servers) {
    return servers.filter(function (server) {
      return !server.comingSoon;
    });
  }

  function renderHeroStatus(servers) {
    const container = document.getElementById("hero-server-list");
    if (!container) return;
    const preservedScrollTop = container.scrollTop;
    container.replaceChildren();

    servers.forEach(function (server, serverIndex) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "command-status-row";
      row.setAttribute("aria-label", `Zu ${server.title} springen`);
      const dotStatus = server.comingSoon ? "checking" : server.status;
      const detailText = server.comingSoon
        ? "Bald verfügbar"
        : server.status === "online"
          ? `${server.players}/${server.maxPlayers} Spieler`
          : statusLabel(server.status);

      row.appendChild(textElement("span", `command-status-dot status-${dotStatus}`, ""));
      row.appendChild(textElement("strong", "", server.title));
      row.appendChild(textElement("span", "", detailText));
      row.addEventListener("click", function () {
        focusServerCard(serverIndex);
      });
      container.appendChild(row);
    });

    const capybaraRow = document.createElement("a");
    capybaraRow.className = "command-status-row command-status-link-row capybara-status-row";
    capybaraRow.href = "https://www.google.com/search?tbm=isch&q=capybara";
    capybaraRow.target = "_blank";
    capybaraRow.rel = "noopener noreferrer";
    capybaraRow.setAttribute("aria-label", "Capybara-Bildersuche bei Google öffnen");
    capybaraRow.appendChild(textElement("span", "command-status-dot status-online", ""));
    capybaraRow.appendChild(textElement("strong", "", "Capybara Bilder"));
    capybaraRow.appendChild(textElement("span", "", "Google öffnen ↗"));
    container.appendChild(capybaraRow);

    window.requestAnimationFrame(function () {
      container.scrollTop = Math.min(preservedScrollTop, Math.max(0, container.scrollHeight - container.clientHeight));
    });
  }

  function renderStats(servers) {
    const availableServers = realServers(servers);
    const online = availableServers.filter(function (server) { return server.status === "online"; });
    const playerCount = online.reduce(function (sum, server) { return sum + server.players; }, 0);

    const onlineCount = document.getElementById("online-server-count");
    const totalPlayers = document.getElementById("total-player-count");
    const summary = document.getElementById("server-summary");

    if (onlineCount) onlineCount.textContent = String(online.length);
    if (totalPlayers) totalPlayers.textContent = String(playerCount);
    if (summary) {
      summary.replaceChildren();
      summary.appendChild(textElement("span", "status-dot", ""));
      summary.appendChild(textElement("strong", "", String(online.length)));
      summary.append(` von ${availableServers.length} Servern online`);
    }
  }

  function maximumScroll() {
    if (!carousel.track) return 0;
    return Math.max(0, carousel.track.scrollWidth - carousel.track.clientWidth);
  }

  function currentScrollRatio() {
    const maximum = maximumScroll();
    return maximum > 0 && carousel.track ? carousel.track.scrollLeft / maximum : 0;
  }

  function updateCarouselControls() {
    if (!carousel.track || !carousel.slider) return;
    const maximum = maximumScroll();
    const position = Math.max(0, Math.min(maximum, carousel.track.scrollLeft));
    carousel.slider.value = maximum > 0 ? String(Math.round((position / maximum) * 1000)) : "0";

    if (carousel.previous) carousel.previous.disabled = position <= 2;
    if (carousel.next) carousel.next.disabled = position >= maximum - 2;
  }

  function queueCarouselUpdate() {
    if (carousel.scrollFrame) return;
    carousel.scrollFrame = window.requestAnimationFrame(function () {
      carousel.scrollFrame = 0;
      updateCarouselControls();
    });
  }

  function cardScrollStep() {
    if (!carousel.track) return 320;
    const card = carousel.track.querySelector(".game-server-card");
    if (!card) return Math.max(320, carousel.track.clientWidth * 0.8);
    const styles = window.getComputedStyle(carousel.track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "20") || 20;
    return card.getBoundingClientRect().width + gap;
  }

  function readAuraState() {
    try {
      auraState.playerId = localStorage.getItem(auraStorageKeys.playerId) || "";
      auraState.playerName = localStorage.getItem(auraStorageKeys.playerName) || "";
      auraState.score = Math.max(0, Number(localStorage.getItem(auraStorageKeys.score)) || 0);
      auraState.confirmedScore = auraState.score;
      const storedCapybaras = JSON.parse(localStorage.getItem(auraStorageKeys.capybaras) || "[]");
      auraState.foundCapybaras = new Set(Array.isArray(storedCapybaras) ? storedCapybaras : []);
    } catch (error) {
      auraState.playerId = "";
      auraState.playerName = "";
      auraState.score = 0;
      auraState.confirmedScore = 0;
      auraState.foundCapybaras = new Set();
    }
  }

  function writeAuraState() {
    try {
      localStorage.setItem(auraStorageKeys.playerId, auraState.playerId);
      localStorage.setItem(auraStorageKeys.playerName, auraState.playerName);
      localStorage.setItem(auraStorageKeys.score, String(auraState.score));
      localStorage.setItem(auraStorageKeys.capybaras, JSON.stringify([...auraState.foundCapybaras]));
    } catch (error) {
      // The leaderboard still works for this page view if storage is unavailable.
    }
  }

  function createAuraPlayerId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    const random = new Uint32Array(4);
    if (window.crypto && typeof window.crypto.getRandomValues === "function") {
      window.crypto.getRandomValues(random);
      return Array.from(random, function (value) { return value.toString(36); }).join("-");
    }

    return `bwes-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  }

  function normalizeAuraName(value) {
    return String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
  }

  function validAuraName(value) {
    const name = normalizeAuraName(value);
    return name.length >= 2
      && name.length <= 18
      && /^[\p{L}\p{N} _.-]+$/u.test(name);
  }

  function formatAura(value) {
    return new Intl.NumberFormat("de-DE").format(Math.max(0, Number(value) || 0));
  }

  function badgeIds(badges) {
    return (Array.isArray(badges) ? badges : []).map(function (badge) { return badge && badge.id; }).filter(Boolean);
  }

  function createBadgeChip(badge, compact) {
    const chip = document.createElement("span");
    chip.className = `aura-badge aura-badge-${badge.tone || "gray"}${compact ? " is-compact" : ""}`;
    chip.title = badge.description || badge.label || "Aura Badge";
    chip.setAttribute("aria-label", `${badge.display || badge.label || "Badge"}: ${badge.description || ""}`);
    if (badge.display) {
      chip.appendChild(textElement("span", "aura-badge-label", badge.display));
    } else {
      chip.appendChild(textElement("span", "aura-badge-icon", badge.icon || "✦"));
      chip.appendChild(textElement("span", "aura-badge-label", badge.label || "Badge"));
    }
    return chip;
  }

  function renderBadgeStrip(container, badges, limit, compact) {
    if (!container) return;
    container.replaceChildren();
    const list = Array.isArray(badges) ? badges.slice(0, limit || badges.length) : [];
    list.forEach(function (badge) { container.appendChild(createBadgeChip(badge, compact)); });
    if (Array.isArray(badges) && badges.length > list.length) {
      const more = textElement("span", "aura-badge aura-badge-more is-compact", `+${badges.length - list.length}`);
      more.title = badges.slice(list.length).map(function (badge) { return badge.label; }).join(", ");
      container.appendChild(more);
    }
  }

  function showBadgeUnlock(badge) {
    if (!badge) return;
    const popup = document.getElementById("aura-badge-unlock");
    const icon = document.getElementById("aura-badge-unlock-icon");
    const name = document.getElementById("aura-badge-unlock-name");
    const description = document.getElementById("aura-badge-unlock-description");
    if (!popup) return;
    if (icon) icon.textContent = badge.icon || "🏆";
    if (name) name.textContent = badge.label || "Neuer Badge";
    if (description) description.textContent = badge.description || "Badge freigeschaltet.";
    popup.className = `aura-badge-unlock aura-badge-${badge.tone || "gray"} is-visible`;
    window.clearTimeout(showBadgeUnlock.timer);
    showBadgeUnlock.timer = window.setTimeout(function () { popup.classList.remove("is-visible"); }, 3600);
  }

  function applyPlayerPayload(player, showUnlocks) {
    if (!player) return;
    const previous = new Set(badgeIds(auraState.badges));
    auraState.playerName = player.name || auraState.playerName;
    auraState.confirmedScore = Math.max(0, Number(player.score) || 0);
    auraState.score = auraState.confirmedScore + (auraState.pendingAwards * 100);
    auraState.clicks = Math.max(0, Number(player.clicks) || 0);
    auraState.badges = Array.isArray(player.badges) ? player.badges : [];
    if (showUnlocks) {
      const currentIds = new Set(badgeIds(auraState.badges));
      const leavingExclusive67 = previous.has("special_67") && !currentIds.has("special_67");
      const unlocked = auraState.badges.filter(function (badge) { return badge && !previous.has(badge.id); });
      // Wenn der exklusive 67-Badge beim nächsten Klick verschwindet, sind die
      // normalen Badges nur wieder sichtbar und nicht erneut freigeschaltet.
      if (!leavingExclusive67 && unlocked.length) showBadgeUnlock(unlocked[unlocked.length - 1]);
    }
    writeAuraState();
    updateAuraProfileUI();
  }

  function setAuraStatus(message, isError) {
    const status = document.getElementById("aura-ranking-status");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function updateAuraProfileUI() {
    const buttonScore = document.getElementById("aura-button-score");
    const profileName = document.getElementById("aura-profile-name");
    const profileScore = document.getElementById("aura-profile-score");
    const profileNote = document.getElementById("aura-profile-note");
    const profileBadges = document.getElementById("aura-profile-badges");
    const profileClicks = document.getElementById("aura-profile-clicks");

    if (buttonScore) buttonScore.textContent = formatAura(auraState.score);
    if (profileName) profileName.textContent = auraState.playerName || "Noch namenlos";
    if (profileScore) profileScore.textContent = formatAura(auraState.score);
    if (profileClicks) profileClicks.textContent = `${formatAura(auraState.clicks)} Klick${auraState.clicks === 1 ? "" : "s"}`;
    renderBadgeStrip(profileBadges, auraState.badges, 8, false);
    if (profileNote) {
      profileNote.textContent = auraState.playerName
        ? "Dein Stand ist mit diesem Browser verknüpft und wird mit der Rangliste synchronisiert."
        : "Klicke oben auf AURA, wähle beim ersten Mal einen Namen und sammle deine ersten Punkte.";
    }
  }

  async function auraApi(url, options) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "Content-Type": "application/json", ...(options && options.headers ? options.headers : {}) },
      ...options
    });

    let payload = {};
    try {
      payload = await response.json();
    } catch (error) {
      payload = {};
    }

    if (!response.ok) {
      const apiError = new Error(payload.error || "Aura konnte nicht synchronisiert werden.");
      apiError.status = response.status;
      apiError.payload = payload;
      throw apiError;
    }

    return payload;
  }

  function isCurrentAuraPlayer(player) {
    return player && (
      player.isCurrent === true
      || (auraState.playerName && player.name === auraState.playerName && Number(player.score) === Number(auraState.score))
    );
  }

  function createPodiumPlace(player, rank) {
    const place = document.createElement("article");
    place.className = `aura-podium-place aura-podium-place-${rank}`;
    place.setAttribute("aria-label", player ? `Platz ${rank}: ${player.name} mit ${formatAura(player.score)} Aura` : `Platz ${rank} ist noch frei`);
    if (player && isCurrentAuraPlayer(player)) place.classList.add("is-current-player");

    const crown = textElement("span", "aura-podium-crown", rank === 1 ? "♛" : rank === 2 ? "◇" : "◆");
    const avatar = textElement("span", "aura-podium-avatar", player ? String(player.name || "?").trim().charAt(0).toUpperCase() : "?");
    const name = textElement("strong", "aura-podium-name", player ? player.name : "Noch frei");
    const score = textElement("span", "aura-podium-score", player ? formatAura(player.score) : "0");
    score.appendChild(textElement("small", "", " AURA"));
    const badges = document.createElement("div");
    badges.className = "aura-podium-badges";
    renderBadgeStrip(badges, player ? player.badges : [], 3, true);

    const block = document.createElement("div");
    block.className = "aura-podium-block";
    block.appendChild(textElement("span", "aura-podium-rank", String(rank)));

    place.appendChild(crown);
    place.appendChild(avatar);
    place.appendChild(name);
    place.appendChild(score);
    place.appendChild(badges);
    place.appendChild(block);
    return place;
  }

  function renderAuraLeaderboard(players) {
    const podium = document.getElementById("aura-podium");
    const list = document.getElementById("aura-leaderboard");
    const playerCount = document.getElementById("aura-player-count");
    if (!list || !podium) return;

    const normalizedPlayers = Array.isArray(players) ? players : [];
    list.replaceChildren();
    podium.replaceChildren();
    if (playerCount) playerCount.textContent = `${normalizedPlayers.length} ${normalizedPlayers.length === 1 ? "Spieler" : "Spieler"}`;

    if (normalizedPlayers.length === 0) {
      const emptyPodium = document.createElement("p");
      emptyPodium.className = "aura-ranking-loading";
      emptyPodium.textContent = "Das Podest wartet auf seinen ersten Aura-Champion.";
      podium.appendChild(emptyPodium);

      const empty = document.createElement("li");
      empty.className = "aura-ranking-loading";
      empty.textContent = "Noch keine Aura-Helden. Der erste Platz wartet.";
      list.appendChild(empty);
      return;
    }

    const podiumOrder = [2, 1, 3];
    podiumOrder.forEach(function (rank) {
      podium.appendChild(createPodiumPlace(normalizedPlayers[rank - 1] || null, rank));
    });

    normalizedPlayers.forEach(function (player, index) {
      const item = document.createElement("li");
      item.className = "aura-ranking-row";
      if (index < 3) item.classList.add(`is-top-${index + 1}`);
      if (isCurrentAuraPlayer(player)) item.classList.add("is-current-player");

      const rank = textElement("span", "aura-rank-number", String(index + 1).padStart(2, "0"));
      const identity = document.createElement("div");
      identity.className = "aura-rank-identity";
      identity.appendChild(textElement("strong", "aura-rank-name", player.name || "Unbekannt"));
      const badges = document.createElement("div");
      badges.className = "aura-rank-badges";
      renderBadgeStrip(badges, player.badges || [], 5, true);
      identity.appendChild(badges);
      const score = textElement("span", "aura-rank-score", formatAura(player.score));
      score.appendChild(textElement("small", "", " AURA"));
      item.appendChild(rank);
      item.appendChild(identity);
      item.appendChild(score);
      list.appendChild(item);
    });
  }

  async function refreshAuraLeaderboard(showMessage) {
    const refreshButton = document.getElementById("aura-refresh");
    if (refreshButton) refreshButton.disabled = true;

    try {
      const query = auraState.playerId ? `?playerId=${encodeURIComponent(auraState.playerId)}` : "";
      const payload = await auraApi(`/api/aura${query}`);
      if (payload.player) applyPlayerPayload(payload.player, false);
      renderAuraLeaderboard(payload.leaderboard || []);
      setAuraStatus(showMessage ? "Rangliste aktualisiert." : "", false);
    } catch (error) {
      setAuraStatus("Rangliste momentan nicht erreichbar. Prüfe in Cloudflare das D1-Binding „DB“ und veröffentliche die Seite danach erneut.", true);
    } finally {
      if (refreshButton) refreshButton.disabled = false;
    }
  }

  function requestAuraName() {
    const dialog = document.getElementById("aura-name-dialog");
    const input = document.getElementById("aura-player-name");
    const error = document.getElementById("aura-name-error");
    if (!dialog || !input) return Promise.resolve("");

    if (error) error.textContent = "";
    input.value = auraState.playerName || "";
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");

    window.setTimeout(function () { input.focus(); }, 30);
    return new Promise(function (resolve) {
      auraState.nameResolver = resolve;
    });
  }

  function closeAuraNameDialog(value) {
    const dialog = document.getElementById("aura-name-dialog");
    if (dialog) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    if (typeof auraState.nameResolver === "function") {
      const resolver = auraState.nameResolver;
      auraState.nameResolver = null;
      resolver(value || "");
    }
  }

  function setupAuraNameDialog() {
    const dialog = document.getElementById("aura-name-dialog");
    const form = document.getElementById("aura-name-form");
    const input = document.getElementById("aura-player-name");
    const cancel = document.getElementById("aura-name-cancel");
    const error = document.getElementById("aura-name-error");
    if (!dialog || !form || !input) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const name = normalizeAuraName(input.value);
      if (!validAuraName(name)) {
        if (error) error.textContent = "Bitte gib einen gültigen Namen mit 2–18 Zeichen ein.";
        input.focus();
        return;
      }
      closeAuraNameDialog(name);
    });

    cancel?.addEventListener("click", function () { closeAuraNameDialog(""); });
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      closeAuraNameDialog("");
    });
  }

  function playAuraCelebration() {
    const celebration = document.getElementById("aura-celebration");
    const overlayVideo = document.getElementById("aura-overlay-video");
    const auraSound = document.getElementById("aura-sound");
    const trigger = document.getElementById("aura-trigger");
    if (!celebration || !overlayVideo || !auraSound || !trigger) return;

    window.clearTimeout(auraState.refreshTimer);
    celebration.classList.remove("is-active");
    trigger.classList.remove("is-active");
    void celebration.offsetWidth;

    auraSound.pause();
    auraSound.currentTime = 0;
    overlayVideo.pause();
    overlayVideo.currentTime = 0;
    celebration.setAttribute("aria-hidden", "false");
    celebration.classList.add("is-active");
    trigger.classList.add("is-active");

    const soundPromise = auraSound.play();
    if (soundPromise && typeof soundPromise.catch === "function") soundPromise.catch(function () {});
    const videoPromise = overlayVideo.play();
    if (videoPromise && typeof videoPromise.catch === "function") videoPromise.catch(function () {});

    function finishAura() {
      celebration.classList.remove("is-active");
      celebration.setAttribute("aria-hidden", "true");
      trigger.classList.remove("is-active");
      overlayVideo.pause();
      overlayVideo.currentTime = 0;
    }

    auraState.refreshTimer = window.setTimeout(finishAura, 5300);
    overlayVideo.onended = function () {
      window.clearTimeout(auraState.refreshTimer);
      auraState.refreshTimer = window.setTimeout(finishAura, 260);
    };
  }

  async function processAuraQueue() {
    if (auraState.processingAwards || auraState.pendingAwards < 1) return;
    auraState.processingAwards = true;

    while (auraState.pendingAwards > 0) {
      try {
        const payload = await auraApi("/api/aura", {
          method: "POST",
          body: JSON.stringify({
            action: "award",
            playerId: auraState.playerId,
            name: auraState.playerName
          })
        });

        auraState.pendingAwards -= 1;
        applyPlayerPayload(payload.player, true);
        renderAuraLeaderboard(payload.leaderboard || []);

        if (auraState.pendingAwards > 0) {
          setAuraStatus(`${auraState.pendingAwards} Aura-Klick${auraState.pendingAwards === 1 ? "" : "s"} werden noch gespeichert …`, false);
        } else {
          setAuraStatus("Alle Aura-Klicks gespeichert.", false);
        }
      } catch (error) {
        if (error.status === 409 && error.payload && error.payload.code === "NAME_TAKEN") {
          auraState.playerName = "";
          try { localStorage.removeItem(auraStorageKeys.playerName); } catch (storageError) {}
          updateAuraProfileUI();
          setAuraStatus("Dieser Name ist bereits vergeben. Bitte wähle einen anderen.", true);
          const dialogError = document.getElementById("aura-name-error");
          if (dialogError) dialogError.textContent = "Dieser Name ist bereits vergeben.";

          auraState.requestingName = true;
          const replacementName = await requestAuraName();
          auraState.requestingName = false;
          if (replacementName) {
            auraState.playerName = replacementName;
            writeAuraState();
            updateAuraProfileUI();
            continue;
          }

          auraState.pendingAwards = 0;
          auraState.score = auraState.confirmedScore;
          writeAuraState();
          updateAuraProfileUI();
          break;
        }

        auraState.pendingAwards -= 1;
        auraState.score = auraState.confirmedScore + (auraState.pendingAwards * 100);
        writeAuraState();
        updateAuraProfileUI();
        setAuraStatus(error.message || "Aura konnte nicht gespeichert werden.", true);
      }
    }

    auraState.processingAwards = false;
    if (auraState.pendingAwards > 0) window.setTimeout(processAuraQueue, 0);
  }

  async function awardAura() {
    const trigger = document.getElementById("aura-trigger");
    if (!trigger) return;

    if (!auraState.playerName) {
      if (auraState.requestingName) return;
      auraState.requestingName = true;
      const chosenName = await requestAuraName();
      auraState.requestingName = false;
      if (!chosenName) return;
      auraState.playerName = chosenName;
    }

    if (!auraState.playerId) auraState.playerId = createAuraPlayerId();

    auraState.pendingAwards += 1;
    auraState.score += 100;
    writeAuraState();
    updateAuraProfileUI();
    playAuraCelebration();
    setAuraStatus(
      auraState.pendingAwards === 1
        ? "+100 AURA wird gespeichert …"
        : `${auraState.pendingAwards} Aura-Klicks in der Warteschlange …`,
      false
    );

    processAuraQueue();
  }

  async function unlockCapybaraHunter() {
    if (!auraState.playerId || !auraState.playerName || auraState.foundCapybaras.size < 3) return;
    if (badgeIds(auraState.badges).includes("capybara_hunter")) return;
    try {
      const payload = await auraApi("/api/aura", {
        method: "POST",
        body: JSON.stringify({ action: "unlockBadge", playerId: auraState.playerId, badgeId: "capybara_hunter" })
      });
      applyPlayerPayload(payload.player, true);
      renderAuraLeaderboard(payload.leaderboard || []);
    } catch (error) {
      // Badge wird beim nächsten Fund oder Seitenaufruf erneut versucht.
    }
  }

  function setupCapybaraBadges() {
    const eggs = Array.from(document.querySelectorAll(".capybara-egg"));
    eggs.forEach(function (egg, index) {
      const key = egg.className.match(/capybara-egg-(one|two|three)/)?.[1] || String(index + 1);
      if (auraState.foundCapybaras.has(key)) egg.classList.add("is-found");
      egg.addEventListener("click", function () {
        auraState.foundCapybaras.add(key);
        egg.classList.add("is-found");
        writeAuraState();
        unlockCapybaraHunter();
      });
    });
  }

  function setupAuraEffect() {
    const trigger = document.getElementById("aura-trigger");
    const refreshButton = document.getElementById("aura-refresh");
    if (!trigger) return;

    readAuraState();
    updateAuraProfileUI();
    setupAuraNameDialog();
    setupCapybaraBadges();
    trigger.addEventListener("click", awardAura);
    refreshButton?.addEventListener("click", function () { refreshAuraLeaderboard(true); });
    refreshAuraLeaderboard(false).then(unlockCapybaraHunter);
    window.setInterval(function () { refreshAuraLeaderboard(false); }, 30000);
  }

  function setupCommandWindowScroll() {
    const previewWindow = document.querySelector(".command-window");
    const statusList = document.getElementById("hero-server-list");
    if (!previewWindow || !statusList || previewWindow.dataset.scrollReady === "true") return;

    previewWindow.dataset.scrollReady = "true";
    statusList.tabIndex = 0;
    statusList.setAttribute("aria-label", "Scrollbare Serverliste im Vorschaufenster");

    previewWindow.addEventListener("wheel", function (event) {
      const rawDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      const scale = event.deltaMode === 1 ? 22 : event.deltaMode === 2 ? statusList.clientHeight : 1;
      const delta = rawDelta * scale;
      const maximum = Math.max(0, statusList.scrollHeight - statusList.clientHeight);
      if (maximum <= 0 || delta === 0) return;

      const current = statusList.scrollTop;
      const next = Math.max(0, Math.min(maximum, current + delta));
      if (Math.abs(next - current) < 0.5) return;

      event.preventDefault();
      statusList.scrollTop = next;
    }, { passive: false });
  }

  function setupServerCarousel() {
    carousel.track = document.getElementById("game-server-grid");
    carousel.slider = document.getElementById("server-slider");
    carousel.previous = document.getElementById("server-prev");
    carousel.next = document.getElementById("server-next");

    if (!carousel.track || !carousel.slider) return;

    carousel.track.addEventListener("scroll", queueCarouselUpdate, { passive: true });
    carousel.slider.addEventListener("input", function () {
      const maximum = maximumScroll();
      carousel.track.scrollLeft = maximum * (Number(carousel.slider.value) / 1000);
    });

    carousel.previous?.addEventListener("click", function () {
      carousel.track.scrollBy({ left: -cardScrollStep(), behavior: "smooth" });
    });

    carousel.next?.addEventListener("click", function () {
      carousel.track.scrollBy({ left: cardScrollStep(), behavior: "smooth" });
    });

    carousel.track.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      carousel.track.scrollBy({
        left: event.key === "ArrowLeft" ? -cardScrollStep() : cardScrollStep(),
        behavior: "smooth"
      });
    });

    window.addEventListener("resize", queueCarouselUpdate, { passive: true });
    updateCarouselControls();
  }

  function renderServers(servers) {
    const grid = document.getElementById("game-server-grid");
    if (!grid) return;

    const preservedRatio = currentScrollRatio();
    grid.replaceChildren();

    servers.forEach(function (server) {
      grid.appendChild(createServerCard(server));
    });

    window.requestAnimationFrame(function () {
      grid.scrollLeft = maximumScroll() * preservedRatio;
      updateCarouselControls();
    });

    renderHeroStatus(servers);
    renderStats(servers);
    setupOrbitNavigation(servers);
  }

  async function refreshServer(server) {
    if (server.comingSoon || !server.statusEndpoint) return server;

    try {
      const response = await fetch(server.statusEndpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Status endpoint failed");

      const live = await response.json();
      const livePlayers = typeof live.players === "object" && live.players !== null
        ? live.players.online
        : live.players;
      const liveMaximum = typeof live.players === "object" && live.players !== null
        ? live.players.max
        : live.maxPlayers;

      return normalizeServer({
        ...server,
        status: live.online === true ? "online" : (live.maintenance ? "maintenance" : "offline"),
        players: livePlayers ?? 0,
        maxPlayers: Number(liveMaximum) > 0 ? liveMaximum : server.maxPlayers,
        version: server.version || live.version || "",
        map: live.map || server.map
      });
    } catch (error) {
      return normalizeServer({
        ...server,
        status: "unknown",
        players: 0
      });
    }
  }

  async function refreshAllServers(baseServers) {
    const servers = await Promise.all(baseServers.map(refreshServer));
    renderServers(servers);
  }

  function initialize() {
    const baseServers = Array.isArray(config.servers) ? config.servers.map(normalizeServer) : [];
    const year = document.getElementById("current-year");
    if (year) year.textContent = String(new Date().getFullYear());

    setupServerCarousel();
    setupCommandWindowScroll();
    setupAuraEffect();
    renderServers(baseServers);
    refreshAllServers(baseServers);

    const refreshSeconds = Math.max(15, Number(config.refreshIntervalSeconds) || 60);
    window.setInterval(function () {
      refreshAllServers(baseServers);
    }, refreshSeconds * 1000);
  }

  initialize();
})();

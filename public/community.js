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
    score: "bwesAuraScore"
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
    refreshTimer: 0
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
    } catch (error) {
      auraState.playerId = "";
      auraState.playerName = "";
      auraState.score = 0;
      auraState.confirmedScore = 0;
    }
  }

  function writeAuraState() {
    try {
      localStorage.setItem(auraStorageKeys.playerId, auraState.playerId);
      localStorage.setItem(auraStorageKeys.playerName, auraState.playerName);
      localStorage.setItem(auraStorageKeys.score, String(auraState.score));
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

    if (buttonScore) buttonScore.textContent = formatAura(auraState.score);
    if (profileName) profileName.textContent = auraState.playerName || "Noch namenlos";
    if (profileScore) profileScore.textContent = formatAura(auraState.score);
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

  function renderAuraLeaderboard(players) {
    const list = document.getElementById("aura-leaderboard");
    if (!list) return;
    list.replaceChildren();

    if (!Array.isArray(players) || players.length === 0) {
      const empty = document.createElement("li");
      empty.className = "aura-ranking-loading";
      empty.textContent = "Noch keine Aura-Helden. Der erste Platz wartet.";
      list.appendChild(empty);
      return;
    }

    players.slice(0, 10).forEach(function (player, index) {
      const item = document.createElement("li");
      item.className = "aura-ranking-row";
      if (player.isCurrent === true || (auraState.playerName && player.name === auraState.playerName && player.score === auraState.score)) {
        item.classList.add("is-current-player");
      }

      const rank = textElement("span", "aura-rank-number", String(index + 1).padStart(2, "0"));
      const name = textElement("strong", "aura-rank-name", player.name || "Unbekannt");
      const score = textElement("span", "aura-rank-score", formatAura(player.score));
      score.appendChild(textElement("small", "", " AURA"));
      item.appendChild(rank);
      item.appendChild(name);
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
      if (payload.player) {
        auraState.playerName = payload.player.name || auraState.playerName;
        auraState.confirmedScore = Math.max(0, Number(payload.player.score) || 0);
        auraState.score = auraState.confirmedScore + (auraState.pendingAwards * 100);
        writeAuraState();
        updateAuraProfileUI();
      }
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
        auraState.playerName = payload.player.name;
        auraState.confirmedScore = Math.max(0, Number(payload.player.score) || 0);
        auraState.score = auraState.confirmedScore + (auraState.pendingAwards * 100);
        writeAuraState();
        updateAuraProfileUI();
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

  function setupAuraEffect() {
    const trigger = document.getElementById("aura-trigger");
    const refreshButton = document.getElementById("aura-refresh");
    if (!trigger) return;

    readAuraState();
    updateAuraProfileUI();
    setupAuraNameDialog();
    trigger.addEventListener("click", awardAura);
    refreshButton?.addEventListener("click", function () { refreshAuraLeaderboard(true); });
    refreshAuraLeaderboard(false);
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

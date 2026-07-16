(function () {
  "use strict";

  const config = window.PORTAL_CONFIG || {};
  const allowedAccents = new Set(["violet", "cyan", "pink", "green", "amber", "blue"]);
  const liveStatuses = new Set(["online", "offline", "checking", "unknown"]);
  let services = Array.isArray(config.services) ? config.services.map(normalizeService) : [];
  let searchTerm = "";

  function normalizeService(service) {
    return {
      ...service,
      title: String(service.title || "Unbenannter Dienst"),
      description: String(service.description || ""),
      icon: String(service.icon || "✦"),
      image: String(service.image || ""),
      status: String(service.status || "Bereit"),
      statusEndpoint: String(service.statusEndpoint || ""),
      serverAddress: String(service.serverAddress || "")
    };
  }

  function buildServiceUrl(service) {
    if (service.url) return String(service.url);

    const subdomain = String(service.subdomain || "").trim();
    const domain = String(config.domain || window.location.hostname).trim();
    return `https://${subdomain}.${domain}`;
  }

  function statusLabel(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "online") return "Online";
    if (normalized === "offline") return "Offline";
    if (normalized === "checking") return "Prüfe Status";
    if (normalized === "unknown") return "Status unbekannt";
    return String(status || "Bereit");
  }

  function statusClass(status) {
    const normalized = String(status || "").toLowerCase();
    return liveStatuses.has(normalized) ? ` status-${normalized}` : "";
  }

  function appendTextElement(parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function createServiceCard(service) {
    const link = document.createElement("a");
    const url = buildServiceUrl(service);
    const accent = allowedAccents.has(service.accent) ? service.accent : "violet";

    link.className = `service-card accent-${accent}${service.image ? " service-card-image" : ""}`;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${service.title} öffnen`);

    if (service.image) {
      link.style.setProperty("--service-image", `url("${service.image.replace(/"/g, "%22")}")`);
    }

    const top = document.createElement("div");
    top.className = "service-top";

    appendTextElement(top, "span", "service-icon", service.icon).setAttribute("aria-hidden", "true");
    const badge = appendTextElement(top, "span", `service-status${statusClass(service.status)}`, statusLabel(service.status));
    if (service.statusEndpoint) badge.setAttribute("aria-live", "polite");
    link.appendChild(top);

    const content = document.createElement("div");
    content.className = "service-content";
    appendTextElement(content, "h2", "", service.title);
    appendTextElement(content, "p", "service-description", service.description);

    if (service.serverAddress) {
      appendTextElement(content, "span", "service-server-address", service.serverAddress);
    }
    link.appendChild(content);

    const footer = document.createElement("span");
    footer.className = "service-link";
    appendTextElement(footer, "span", "", url.replace(/^https?:\/\//, ""));
    appendTextElement(footer, "span", "service-arrow", "↗").setAttribute("aria-hidden", "true");
    link.appendChild(footer);

    return link;
  }

  function filteredServices() {
    if (!searchTerm) return services;

    return services.filter(function (service) {
      return [
        service.title,
        service.description,
        service.subdomain,
        service.status,
        service.url,
        service.serverAddress
      ]
        .filter(Boolean)
        .some(function (value) {
          return String(value).toLowerCase().includes(searchTerm);
        });
    });
  }

  function renderServices() {
    const grid = document.getElementById("service-grid");
    const emptyState = document.getElementById("empty-state");
    const count = document.getElementById("service-count");
    if (!grid || !emptyState || !count) return;

    const visibleServices = filteredServices();
    grid.replaceChildren();
    visibleServices.forEach(function (service) {
      grid.appendChild(createServiceCard(service));
    });

    count.textContent = `${visibleServices.length} ${visibleServices.length === 1 ? "Dienst" : "Dienste"}`;
    emptyState.style.display = visibleServices.length ? "none" : "block";
  }

  async function loadServiceStatus(service) {
    if (!service.statusEndpoint) return service;

    try {
      const response = await fetch(service.statusEndpoint, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error("Status endpoint failed");

      const live = await response.json();
      return {
        ...service,
        status: live.online === true ? "online" : "offline"
      };
    } catch (error) {
      return {
        ...service,
        status: "unknown"
      };
    }
  }

  async function refreshLiveStatuses() {
    services = await Promise.all(services.map(loadServiceStatus));
    renderServices();
  }

  async function loadAccessIdentity() {
    const nameElement = document.getElementById("user-name");
    const avatarElement = document.getElementById("user-avatar");
    if (!nameElement || !avatarElement) return;

    try {
      const response = await fetch("/cdn-cgi/access/get-identity", {
        credentials: "same-origin",
        cache: "no-store",
        headers: { Accept: "application/json" }
      });

      if (!response.ok) throw new Error("Identity konnte nicht geladen werden.");

      const identity = await response.json();
      const label = identity.name || identity.email || "Angemeldet";
      const avatarSource = identity.name || identity.email || "B";

      nameElement.textContent = label;
      avatarElement.textContent = avatarSource.trim().charAt(0).toUpperCase();
    } catch (error) {
      nameElement.textContent = "Angemeldet";
      avatarElement.textContent = "B";
    }
  }

  function initializePortal() {
    const search = document.getElementById("service-search");

    renderServices();
    refreshLiveStatuses();
    loadAccessIdentity();

    if (search) {
      search.addEventListener("input", function () {
        searchTerm = search.value.toLowerCase().trim();
        renderServices();
      });
    }

    const refreshSeconds = Math.max(15, Number(config.refreshIntervalSeconds) || 60);
    window.setInterval(refreshLiveStatuses, refreshSeconds * 1000);
  }

  initializePortal();
})();

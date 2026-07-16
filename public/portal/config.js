window.PORTAL_CONFIG = {
  domain: "diebwes.com",
  refreshIntervalSeconds: 60,

  services: [
    {
      title: "Minecraft Vanilla Console",
      description: "Serverkonsole und Verwaltung für den Minecraft-Vanilla-Server.",
      icon: "⛏",
      image: "/assets/minecraft.jpg",
      url: "https://console.diebwes.com",
      serverAddress: "mc.diebwes.com:25565",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=vanilla",
      status: "checking",
      accent: "green"
    },
    {
      title: "Minecraft Modpack Console",
      description: "Serverkonsole und Verwaltung für den Minecraft-Modpack-Server.",
      icon: "⚙",
      image: "/assets/atm.png",
      url: "https://modconsole.diebwes.com",
      serverAddress: "modpack.diebwes.com:25566",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=modpack",
      status: "checking",
      accent: "cyan"
    },
    {
      title: "Downloads",
      description: "Maps, Inhalte und weitere Dateien.",
      icon: "📦",
      subdomain: "downloads",
      status: "Beta",
      accent: "pink"
    },
    {
      title: "Status",
      description: "Dienste, Verfügbarkeit und Wartungen.",
      icon: "📡",
      subdomain: "status",
      status: "Online",
      accent: "green"
    },
    {
      title: "Admin",
      description: "Interne Werkzeuge und Konfiguration.",
      icon: "⚙️",
      subdomain: "admin",
      status: "Privat",
      accent: "amber"
    },
    {
      title: "Neue Welt",
      description: "Platzhalter für deine nächste Subdomain.",
      icon: "✦",
      subdomain: "neu",
      status: "Geplant",
      accent: "blue"
    }
  ]
};

window.COMMUNITY_CONFIG = {
  refreshIntervalSeconds: 60,

  servers: [
    {
      title: "Trouble in Terrorist Town",
      shortTitle: "TTT",
      game: "Garry's Mod",
      description: "Täuschung, Teamplay und die unvermeidliche Frage, wer gerade schon wieder den Traitor-Raum geöffnet hat.",
      image: "/assets/ttt.jpg",
      status: "checking",
      players: 0,
      maxPlayers: 32,
      map: "ttt_dolls",
      Ingame: "GER | Die Bwes",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=ttt",
      joinUrl: "ttt.diebwes.com:27015",
      tags: ["TTT", "Custom Maps", "FastDL"],
      accent: "red"
    },
    {
      title: "Abiotic Factor",
      shortTitle: "Abiotic Factor",
      game: "Abiotic Factor",
      description: "Wissenschaft, Überleben und die unvermeidliche Frage, wer schon wieder das Portal geöffnet hat. Entkommst du der Facility",
      image: "/assets/abiotic-factor.png",
      status: "checking",
      players: 0,
      maxPlayers: 32,
      map: "Cascade",
      Ingame: "Die Bwes",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=abiotic",
      joinUrl: "abiotic.diebwes.com:7777",
      tags: ["Entkommen","Survial","Monster"],
      accent: "violet"
    },
    {
      title: "Palworld",
      shortTitle: "Palworld",
      game: "Palworld",
      description: "Gemeinsam Pals fangen, Basen errichten und eine Welt erkunden, in der selbst niedliche Kreaturen schweres Gerät bedienen.",
      image: "/assets/palworld.jpg",
      status: "checking",
      players: 0,
      maxPlayers: 16,
      map: "Palpagos Islands",
      Community_Server: "Die Bwes",
      IP::"192.168.0.163:8211",
      version: "",
      versionLabel: "Server-Version",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=palworld",
      joinUrl: "",
      tags: ["Survival", "Open World", "Community"],
      accent: "cyan"
    },
    {
      title: "VANILLA",
      shortTitle: "VANILLA",
      game: "Minecraft",
      description: "Gemeinsam bauen, handeln und erkunden. Eine ruhige Welt für große Projekte und kleine Blockhütten.",
      image: "/assets/minecraft.jpg",
      status: "checking",
      players: 0,
      maxPlayers: 67,
      map: "Survival",
      IP: "mc.diebwes.com",
      version: "26.2",
      versionLabel: "Minecraft-Version",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=vanilla",
      joinUrl: "minecraft://?addExternalServer=Die%20Bwes%20Vanilla|mc.diebwes.com%3A25565",
      tags: ["Survival", "Community", "Events"],
      accent: "green"
    },
    {
      title: "MODPACK",
      shortTitle: "MODPACK",
      game: "Minecraft",
      description: "Entkommst du den Backrooms?",
      image: "/assets/backrooms.jpg",
      status: "checking",
      players: 0,
      maxPlayers: 67,
      map: "Modpack",
      IP: "modpack.diebwes.com",
      version: "1.21.1",
      versionLabel: "Minecraft-Version",
      statusEndpoint: "https://mcstatus.diebwes.com/api/server-status?server=modpack",
      modpackUrl: "https://www.curseforge.com/minecraft/modpacks/into-the-backrooms/files/8292234",
      modpackLabel: "Modpack herunterladen",
      joinUrl: "minecraft://?addExternalServer=Die%20Bwes%20Modpack|modpack.diebwes.com%3A25566",
      tags: ["Modpack", "Cobblemon", "Community"],
      accent: "green"
    },
    {
      comingSoon: true,
      title: "Comming Soon",
      shortTitle: "Slot 05",
      accent: "pink"
    },
    {
      comingSoon: true,
      title: "Comming Soon",
      shortTitle: "Slot 06",
      accent: "blue"
    },
    {
      comingSoon: true,
      title: "Comming Soon",
      shortTitle: "Slot 07",
      accent: "amber"
    }
  ]
};

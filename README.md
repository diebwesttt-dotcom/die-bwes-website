# Die Bwes: GitHub + Cloudflare Pages + D1

Dieses Verzeichnis ist als GitHub-Repository vorbereitet.

## GitHub

1. Neues GitHub-Repository erstellen.
2. Den **Inhalt dieses Ordners** hochladen, nicht die ZIP als einzelne Datei.
3. In der Repository-Wurzel müssen `public`, `functions` und `schema.sql` sichtbar sein.

## Cloudflare Pages verbinden

1. **Workers & Pages > Create > Pages > Import an existing Git repository**.
2. Dieses GitHub-Repository auswählen.
3. Framework: `None`.
4. Build command: `exit 0`.
5. Build output directory: `public`.
6. Root directory leer lassen.
7. Bereitstellen.

## D1 verbinden

1. D1-Datenbank `bwes-aura` erstellen.
2. Im Pages-Projekt: **Settings > Bindings > Add > D1 database**.
3. Variablenname exakt `DB`, Datenbank `bwes-aura`.
4. Für Production und bei Bedarf Preview hinzufügen.
5. Danach einen neuen Deployment auslösen, zum Beispiel durch einen kleinen GitHub-Commit.
6. `https://DEINE-DOMAIN/api/aura` testen.

Die Pages Function liegt in `functions/api/aura.js`. Cloudflare macht daraus automatisch `/api/aura`. Die Datenbanktabelle wird beim ersten API-Aufruf automatisch angelegt.

## Projektstruktur

```text
public/                  statische Website
functions/api/aura.js   Cloudflare Pages Function
schema.sql               optionale manuelle D1-Initialisierung
```

## Hinweis zur anonymen Speicherung

Jeder Browser erhält eine zufällige ID in `localStorage`. Es ist keine Anmeldung nötig. Nach dem Löschen der Browserdaten wird ein neues Profil angelegt.

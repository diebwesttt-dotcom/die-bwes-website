# Vorschaufenster-Fix v8

1. ZIP entpacken.
2. Im bestehenden GitHub-Repository `Add file` → `Upload files` öffnen.
3. Den Ordner `public` aus diesem Paket hochladen.
4. Vorhandene Dateien ersetzen und direkt nach `main` committen.

Cloudflare Pages startet danach automatisch ein neues Deployment.
Die D1-Datenbank und bestehende Aura-Punkte bleiben unverändert.

## Änderung

- Das Desktop-Vorschaufenster ist höher und sauber aufgeteilt.
- Die Serverliste besitzt jetzt genügend sichtbare Höhe.
- Die letzte Server- bzw. Capybara-Zeile kann vollständig erreicht werden.
- Der Orbit wurde auf Desktop leicht verkleinert, damit nichts außerhalb des Fensters liegt.

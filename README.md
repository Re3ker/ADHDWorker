# ADHDWorker

Lokales MVP zur Dokumentation eines Arbeitstags. MariaDB ist die Wahrheit; Telegram ist Ausgabe; Clockify bleibt ein kopierbarer Export.

## Voraussetzungen

- Node.js 20+
- MariaDB 10.6+ auf `127.0.0.1:3306`
- Optional: Telegram-Bot und Ziel-Chat

Die lokale Datenbank anlegen:

```sql
CREATE DATABASE IF NOT EXISTS adhdworker
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`.env.example` nach `.env` kopieren und Werte eintragen. Die Beispiel-URL nutzt `ssl-mode=DISABLED`, weil die lokale MariaDB-Installation unter Windows sonst eine Client-TLS-Anmeldung verlangt.

Bot-Token und Chat-ID werden unter `/settings` in der Datenbank gespeichert. `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` in `.env` sind nur optionale Bootstrap-Werte für eine leere Datenbank; sobald die App startet, werden sie in `settings` übernommen. Der Token wird nie an den Browser gesendet.

## Starten

```bash
npm install
npx prisma migrate dev --name init_adhdworker
npm run dev
```

Dashboard: <http://localhost:3000>

`npm run dev` startet Next.js und den Worker gemeinsam. Für getrennten Betrieb kann der Worker separat gestartet werden:

```bash
npm run worker
```

Der Worker prüft alle 10 Sekunden fällige Arbeitstage und Nachrichten. Telegram-Fehler blockieren den Arbeitsstart nicht und können im Dashboard oder Verlauf erneut gesendet werden.

## Prüfen

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

`smoke` durchläuft den kompletten Workday-Zustandsablauf gegen die lokale Datenbank und entfernt die Testdaten danach wieder.

## Routen

- `/` — Arbeitsstatus, Aufgaben, Pause/Fortsetzen/Beenden und Export
- `/settings` — Standardwerte, Telegram-Chat-ID und Vorlagen
- `/history` — abgeschlossene Arbeitstage, Clockify-Zeilen und Telegram-Protokoll

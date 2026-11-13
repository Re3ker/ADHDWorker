# ADHDWorker

Lokale Electron-App, die zuverlässig an die vier täglichen Meldungen erinnert:
Anmelden, zur Pause abmelden, wieder anmelden und Feierabend. Jede Meldung geht
per Knopfdruck pünktlich an Telegram. Start und Pause sind flexibel, der
Feierabend ergibt sich aus den eingestellten Soll-Stunden. Am Ende des Tages
stehen Aufgaben, Start- und Endzeit pro Abschnitt zum Kopieren bereit.

## Voraussetzungen

- Node.js 20+
- Optional: Telegram-Bot und Ziel-Chat

## Starten

```bash
npm install --legacy-peer-deps
npm run dev
```

`dev` öffnet direkt ein Electron-Fenster. Es wird kein Browser und kein lokaler
Webserver gestartet.

Für den lokalen Produktionslauf:

```bash
npm run build
npm run start
```

## Windows-Release

Eine installierbare Windows-Version wird aus dem Projekt erzeugt mit:

```bash
npm.cmd run package:win
```

Danach liegen ein NSIS-Installer und eine portable EXE unter `release/`. Der
Installer kann einen Desktop- und Startmenüeintrag anlegen. Die lokale SQLite-
Datenbank liegt weiterhin im Electron-`userData`-Ordner und bleibt bei Updates
und einer Deinstallation erhalten.

Releases entstehen automatisch durch einen Git-Tag wie `v0.1.0`:

```bash
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions prüft den Build und hängt Installer sowie portable EXE an das
GitHub Release. Die App weist bei einer neueren stabilen GitHub-Version nur auf
die Download-Seite hin; sie installiert Updates nicht selbst. Die erste Version
ist nicht code-signiert, daher kann Windows SmartScreen beim ersten Download
warnen.

## Daten und Einstellungen

Beim Start wird die SQLite-Datei automatisch unter Electron-`userData` angelegt
und die Prisma-Migration ausgeführt. Die Entwicklungsdatenbank für `smoke` liegt
unter `prisma/dev.db` und wird nicht versioniert. Bestehende MariaDB-Daten
werden nicht importiert oder verändert.

Telegram-Token und Chat-ID können in der App gespeichert werden. Der Token bleibt
im Main-Prozess und wird nie an den React-Renderer übergeben.

`.env.example`:

```text
DATABASE_URL="file:./dev.db"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
```

## Prüfen

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

Der Smoke-Test spielt einen ganzen Tag gegen SQLite durch: vorgemerkte
Anmeldung, flexible Pause, verspätete Rückkehr, Feierabend nach Soll-Stunden,
Tagesabschluss-Blöcke und Erinnerungslogik.

Das App-Icon wird mit `npm run icons` aus `resources/icon/*.svg` erzeugt.

## Architektur

```text
src/main/      Electron, Tray, Prisma, Telegram, Worker, IPC
src/preload/   typisierte und validierte window.adhdworker-Brücke
src/renderer/  React-Oberfläche und lokale UI-Zustände
src/shared/    Zeit, Schemas, Tagesplan, Tagesabschluss, Nachrichten, Typen
prisma/        Schema und SQLite-Migrationen
```

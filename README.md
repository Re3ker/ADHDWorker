# ADHDWorker

Lokale Electron-App zur Dokumentation von Arbeitszeit, Arbeitsphasen und
erledigten Aufgaben. SQLite ist die zentrale Datenquelle; Telegram ist eine
optionale Ausgabe und Clockify ein kopierbarer Export.

## Voraussetzungen

- Node.js 20+
- Optional: Telegram-Bot und Ziel-Chat

## Starten

```bash
npm install
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
APP_TIMEZONE="Europe/Berlin"
```

## Prüfen

```bash
npm run lint
npm run typecheck
npm run build
npm run smoke
```

Der Smoke-Test prüft Planung, geplanten Start, Aufgaben, Pause, Fortsetzen,
Beenden und Clockify-Export gegen SQLite.

## Architektur

```text
src/main/      Electron, Tray, Prisma, Telegram, Worker, IPC
src/preload/   typisierte und validierte window.adhdworker-Brücke
src/renderer/  React-Oberfläche und lokale UI-Zustände
src/shared/    Zeit, Validierung, Nachrichten, Clockify und Typen
prisma/        Schema und SQLite-Migrationen
```

# AGENTS.md — ADHDWorker

ADHDWorker ist eine reine Electron-Desktop-App. Es gibt keine Website, keinen
lokalen HTTP-Server und keine Next.js-Laufzeit.

## Struktur

- `src/main/`: Electron-Lifecycle, Tray, Prisma/SQLite, Telegram, Worker und IPC-Handler
- `src/preload/`: einzige typisierte und validierte Brücke zum Renderer
- `src/renderer/`: React-Oberfläche, Styles und lokale UI-Zustände
- `src/shared/`: Typen, Zeit-, Clockify-, Nachrichten- und Validierungslogik
- `prisma/`: SQLite-Schema und Migrationen

## Architekturregeln

- Prisma und Telegram laufen ausschließlich im Main-Prozess.
- Der Renderer verwendet ausschließlich `window.adhdworker`.
- Eingaben werden im Preload und im Main-Prozess mit Zod validiert.
- Zeiten werden in UTC gespeichert und in `Europe/Berlin` angezeigt/exportiert.
- SQLite liegt im Electron-`userData`-Verzeichnis. MariaDB-Daten werden nicht importiert.
- Der Worker läuft im Main-Prozess alle zehn Sekunden; Browser-Timer sind keine
  Quelle für geplante Starts oder Nachrichten.
- Telegram-Token werden nie an den Renderer übergeben.
- Fehler werden als verständliche nächste Aktion angezeigt; Aufgaben bleiben
  direkt und automatisch speicherbar.

## Zustandsmaschine

```text
kein Arbeitstag → planned → working ↔ paused → finished
planned → cancelled
```

Nur offene Work-Sessions nehmen Aufgaben an. Break-Sessions werden nicht in den
Clockify-Export aufgenommen. Es gibt maximal einen offenen Arbeitstag und eine
aktive Session.

## Entwicklung

```text
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
npm run smoke
```

`dev`, `build` und `start` verwenden Electron-Vite. Die App startet direkt als
Desktop-Fenster. `npm run smoke` testet den Workday-Ablauf gegen die lokale
SQLite-Testdatenbank.

## Skills

- `adhd-design-expert`: sichtbarer Status, eindeutige Hauptaktion, geringe
  kognitive Last, konkrete Zeiten und freundliche Fehler.
- `caveman`: kleinste funktionierende Lösung, keine unnötigen Abstraktionen.
- `i-have-adhd`: Auto-Save, persistente Zustände, schnelle Aufgabeneingabe und
  gut auffindbarer Verlauf/Export.

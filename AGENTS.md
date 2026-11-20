# AGENTS.md — ADHDWorker

ADHDWorker ist eine reine Electron-Desktop-App. Es gibt keine Website, keinen
lokalen HTTP-Server und keine Next.js-Laufzeit.

## Struktur

- `src/main/`: Electron-Lifecycle (`main.ts`), Fenster/Tray (`window.ts`), IPC (`ipc-handlers.ts`), Prisma/SQLite, Telegram, Erinnerungen (`reminders.ts`) und Worker
- `src/preload/`: einzige typisierte und validierte Brücke zum Renderer
- `src/renderer/`: React-Oberfläche, Styles und lokale UI-Zustände
- `src/shared/`: Typen, Zod-Schemas, Zeit, Tagesplan (`day-plan.ts`), Tagesabschluss (`day-export.ts`) und Nachrichten
- `prisma/`: SQLite-Schema und Migrationen

## Architekturregeln

- Prisma und Telegram laufen ausschließlich im Main-Prozess.
- Der Renderer verwendet ausschließlich `window.adhdworker`.
- Eingaben werden im Preload und im Main-Prozess mit Zod validiert.
- Zeiten werden in UTC gespeichert und in `Europe/Berlin` angezeigt/exportiert.
- SQLite liegt im Electron-`userData`-Verzeichnis. MariaDB-Daten werden nicht importiert.
- Der Worker läuft im Main-Prozess alle zehn Sekunden (plus exakter Timer auf die
  nächste vorgemerkte Aktion); Browser-Timer sind keine Quelle für geplante
  Aktionen, Erinnerungen oder Nachrichten.
- Es gibt keine Clockify-Anbindung. Der Tagesabschluss zeigt pro Arbeitsabschnitt
  kopierbare Felder (Aufgaben, Start `0845`, Ende).
- Telegram-Token werden nie an den Renderer übergeben.
- Fehler werden als verständliche nächste Aktion angezeigt; Aufgaben bleiben
  direkt und automatisch speicherbar.

## Zustandsmaschine

```text
kein Arbeitstag → planned → working ↔ paused → finished
planned → cancelled
```

Die vier Schritte sind An-/Abmeldungen per Telegram: Anmelden (start), zur Pause
abmelden (pause), wieder anmelden (resume), Feierabend (end). Eine Erinnerung
erscheint `leadMinutes` vor der Ziel-Uhrzeit (Anmelden nur Mo–Fr). Bestätigt man
vor der Uhrzeit, wird die Aktion als `pendingAction` am Workday vorgemerkt und
genau zur Uhrzeit ausgeführt. Liegt die gewählte Uhrzeit schon zurück, wird
sofort ausgeführt, eingetragen wird aber die gewählte Uhrzeit. Erledigte Schritte
lassen sich über `adjustTime` nachträglich korrigieren. „Überstunden“ schaltet
die Feierabend-Erinnerung für heute ab.

Start- und Pausenzeit sind pro Tag flexibel. Der Feierabend wird in
`computeDayPlan` aus Start + Soll-Minuten + Pausenzeit berechnet.

Aufgaben gehören zum Workday und einem Abschnitt (`part`: 0 = vor der Pause,
1 = nach der Pause, …) und sind jederzeit in jedem Abschnitt ergänzbar, auch
nach dem Feierabend. Im Export landen Aufgaben eines nicht existierenden
Abschnitts im letzten Arbeitsabschnitt.
Break-Sessions zählen nicht zur Arbeitszeit. Es gibt maximal einen offenen
Arbeitstag und eine aktive Session.

## Entwicklung

```text
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke
npm run icons
```

`dev`, `build` und `start` verwenden Electron-Vite. Die App startet direkt als
Desktop-Fenster. `npm run smoke` spielt einen ganzen Tag (vorgemerkte
Aktionen, flexible Pause, Feierabend nach Soll-Stunden, Erinnerungen) gegen
SQLite durch. `npm run icons` erzeugt die Icons aus `resources/icon/*.svg`.
`npm test` (Vitest) prüft die reine Logik in `src/shared/` – neue Rechenlogik
dort ablegen und testen, nicht im Main-Prozess. Releases entstehen nur durch
Tags (`npm version patch && git push --follow-tags`); die installierte App
aktualisiert sich per `electron-updater`. Vor den Migrationen wird täglich eine
DB-Sicherung in `userData/backups/` angelegt (14 Tage).

## Skills

- `adhd-design-expert`: sichtbarer Status, eindeutige Hauptaktion, geringe
  kognitive Last, konkrete Zeiten und freundliche Fehler.
- `caveman`: kleinste funktionierende Lösung, keine unnötigen Abstraktionen.
- `i-have-adhd`: Auto-Save, persistente Zustände, schnelle Aufgabeneingabe und
  gut auffindbarer Verlauf/Export.

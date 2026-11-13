# ADHDWorker — Desktop-Bauplan

ADHDWorker ist eine reine Electron-App mit React-Renderer und Electron-Vite.
Next.js, App Router, Server Actions, Route Handlers und lokale Webserver sind
nicht Teil des Projekts.

## Architektur

```text
src/main/      Electron-Lifecycle, Tray, SQLite/Prisma, Telegram, Worker, IPC
src/preload/   typisierte, validierte contextBridge
src/renderer/  React-UI, Navigation, Styles
src/shared/    Typen, Zod-Validierung, Zeit- und Exportlogik
prisma/        SQLite-Schema und Migrationen
```

Die Datenbank wird beim Electron-Start unter `app.getPath("userData")` angelegt,
per `prisma migrate deploy` migriert und danach als zentrale Quelle verwendet.
Der Worker prüft alle zehn Sekunden vorgemerkte An-/Abmeldungen, fällige
Telegram-Nachrichten und Erinnerungen. Telegram ist die einzige Integration.

## Fachlicher Ablauf

```text
Erinnerung → bestätigen → (vorgemerkt) → zur Uhrzeit ausführen + Telegram
anmelden → working → pause → paused → wieder anmelden → working → feierabend → finished
planned → cancelled
```

Aufgaben gehören zur offenen Work-Session. Break-Sessions zählen nicht als Arbeitszeit
und erscheinen nicht im Tagesabschluss. Telegram-Fehler bleiben im Protokoll und können
erneut gesendet werden.

## Abnahme

- `npm run dev` startet die Desktop-App direkt.
- `npm run build` erzeugt Main-, Preload- und Renderer-Build.
- `npm run start` startet die Electron-Vorschau.
- `npm run lint`, `npm run typecheck` und `npm run smoke` laufen erfolgreich.
- Tray, Minimieren beim Schließen, vollständiges Beenden, Worker und Desktop-
  Benachrichtigungen bleiben konfigurierbar.

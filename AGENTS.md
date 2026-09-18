<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — ADHDWorker

## Projekt

ADHDWorker ist eine persönliche Web-App zur Dokumentation von Arbeitszeit,
Arbeitsphasen und erledigten Aufgaben.

Ziel der App:

1. Arbeit für eine konfigurierte Uhrzeit planen.
2. Eine Startnachricht beim Planen sofort an Telegram senden.
3. Aufgaben während einer Arbeitsphase schnell erfassen.
4. Beim Pausenstart eine Telegram-Nachricht mit erledigten Aufgaben senden.
5. Beim Fortsetzen eine Telegram-Nachricht senden.
6. Beim Arbeitsende eine Abschlussnachricht mit Aufgaben senden.
7. Clockify-kompatible Arbeitsblöcke kopierbar erzeugen.

Die Datenbank ist die zentrale Datenquelle. Telegram und Clockify sind externe
Integrationen und dürfen niemals die einzige Quelle für Zeiten oder Aufgaben
sein.

---

## Technologie-Stack

- Framework: Next.js mit App Router und TypeScript
- UI: shadcn/ui und Base UI
- Styling: Tailwind CSS
- Datenbank: MariaDB
- ORM: Prisma
- Validierung: Zod
- Formulare: React Hook Form
- Telegram: Telegram Bot API
- Geplante Nachrichten: lokaler Node-Worker oder Cronjob
- Zeitzone: `Europe/Berlin`

---

## Agent-Skills

Die folgenden Skills liegen im Verzeichnis `.agents/` und müssen bei der
Planung, dem Design und der Umsetzung berücksichtigt werden.

```text
.agents/
├── adhd-design-expert/
├── caveman/
├── plan-handoff/
└── i-have-adhd/
```

### `adhd-design-expert`

Für UI und User Experience verwenden.

Regeln:

- Immer nur eine eindeutige Hauptaktion pro Status hervorheben.
- Aktuellen Arbeitsstatus klar und dauerhaft sichtbar machen.
- Große, leicht erkennbare Buttons verwenden.
- Wenige Entscheidungen gleichzeitig zeigen.
- Keine überladenen Ansichten bauen.
- Eingaben automatisch speichern.
- Fehler freundlich, klar und mit einer nächsten Aktion darstellen.
- Sinnvolle Standardwerte für wiederkehrende Abläufe nutzen.

### `caveman`

Für eine konsequent einfache MVP-Architektur verwenden.

Regeln:

- Zuerst die kleinste funktionierende Lösung bauen.
- Keine unnötigen Abstraktionen oder Features.
- Klarer, expliziter und wartbarer Code vor komplexer Magie.
- Datenbank- und Zustandslogik nachvollziehbar halten.
- Lokalen Ablauf zuverlässig bauen, bevor komplexe Integrationen folgen.
- Kein Overengineering.

### `i-have-adhd`

Für geringe kognitive Belastung und einen fokussierten Arbeitsfluss verwenden.

Regeln:

- Der aktuelle Status muss sofort verständlich sein.
- Die nächste sinnvolle Aktion muss eindeutig sein.
- Aufgaben-Eingabe schnell erreichbar machen.
- Wiederkehrende Einstellungen nur einmal abfragen.
- Standardwerte bevorzugen.
- Kritische Aktionen kurz bestätigen.
- Export, Verlauf und Fehlerfälle leicht wieder auffindbar machen.
- Keine Daten verlieren: Auto-Save und persistente Zustände priorisieren.

## Plan-to-Execution Handoff

For work that uses planning followed by implementation — especially when the
model may change between those phases — the `plan-handoff` skill is mandatory.

- Use the existing plan mode normally for discovery, questions, and planning.
- Before presenting a final plan, load and follow the `plan-handoff` skill.
- The final plan must include the skill's handoff requirements.
- When the user requests implementation of a prior plan, load and follow the
  `plan-handoff` skill before making changes.
- Treat the most recent approved plan as the implementation contract.
- Do not make material scope, architecture, API, dependency, migration, or
  security changes without asking the user first.

---

## Produktablauf

### Arbeit starten

Der Benutzer klickt auf `Arbeit starten`.

Ein Dialog zeigt:

- geplante Startzeit,
- bearbeitbare Telegram-Startnachricht,
- Telegram-Zielchat,
- Option zum sofortigen Start.

Regeln:

- Die Arbeitszeit beginnt zur geplanten Startzeit.
- Die Arbeitszeit beginnt nicht beim Klick auf den Button.
- Die Startnachricht wird beim Planen sofort gesendet und nennt die geplante Startzeit.
- Ein Browser-Timer allein darf dafür nicht verwendet werden.

### Aufgaben erfassen

Während einer aktiven Arbeitsphase können einzeilige Aufgaben erfasst werden.

Beispiele:

```text
Ticket XY erledigt
Login-Bug behoben
Code Review durchgeführt
```

Regeln:

- Aufgaben gehören immer zur aktuell offenen Work-Session.
- Aufgaben werden automatisch gespeichert.
- Aufgaben können vor Tagesabschluss bearbeitet oder gelöscht werden.
- Nach dem Hinzufügen bleibt die Eingabe schnell weiter nutzbar.

### Pause starten

Beim Klick auf `Pause starten`:

1. Die aktuelle Work-Session wird beendet.
2. Eine Break-Session beginnt.
3. Eine Pausennachricht wird an Telegram gesendet.
4. Die Nachricht enthält alle Aufgaben der abgeschlossenen Work-Session.
5. Die Pausenzeit zählt nicht zur Nettoarbeitszeit.

### Arbeit fortsetzen

Beim Klick auf `Arbeit fortsetzen`:

1. Die Break-Session wird beendet.
2. Eine neue Work-Session wird begonnen.
3. Eine Fortsetzungsnachricht wird an Telegram gesendet.
4. Neue Aufgaben gehören zur neuen Work-Session.

Beispiel:

```text
Bin wieder da.
```

### Arbeit beenden

Beim Klick auf `Arbeit beenden`:

1. Die offene Work-Session wird beendet.
2. Der Workday wird abgeschlossen.
3. Eine Abschlussnachricht wird gesendet.
4. Die Nachricht enthält Aufgaben der letzten Work-Session.
5. Der Clockify-Exportdialog wird geöffnet.

---

## Clockify-Export

Der Exportdialog muss nach Arbeitsende automatisch erscheinen und jederzeit
im Verlauf erneut geöffnet werden können.

Zeitformat:

```text
HHmm HHmm
```

Beispiele:

```text
0845 1200
1230 1715
```

Exportformat:

```text
Ticket XY erledigt, Login-Bug behoben | 0845 1200
Admin-Bereich angepasst, Code Review durchgeführt | 1230 1715
```

Regeln:

- Jede Work-Session ist eine Exportzeile.
- Aufgaben innerhalb einer Work-Session sind komma-separiert.
- Break-Sessions werden nicht exportiert.
- Pro Zeile gibt es einen Kopier-Button.
- Der gesamte Tagesexport kann mit einem Klick kopiert werden.
- Exportdaten bleiben im Verlauf verfügbar.

---

## Telegram

Telegram-Nachrichten werden über die Telegram Bot API gesendet.

Nachrichtentypen:

```text
start
pause
resume
end
```

Unterstützte Variablen in Vorlagen:

```text
{date}
{startTime}
{endTime}
{tasks}
```

Beispiel-Pausenvorlage:

```text
Mache jetzt Pause.

Erledigt:
{tasks}
```

Sicherheitsregeln:

- `TELEGRAM_BOT_TOKEN` niemals im Client verwenden.
- Token nur über Server-Code verwenden.
- Token niemals committen.
- Fehlgeschlagene Nachrichten protokollieren.
- Fehlgeschlagene Nachrichten müssen erneut sendbar sein.

---

## Datenbank

MariaDB ist die zentrale Datenquelle.

Lokale Entwicklungsverbindung:

```text
mysql://root:root@localhost:3306/adhdworker
```

`root:root` ist nur für lokale Entwicklung erlaubt. In Produktion muss ein
eigener eingeschränkter Datenbankbenutzer verwendet werden.

### Tabelle: `settings`

Globale Einstellungen für den lokalen Benutzer.

```text
id
timezone
default_start_time
telegram_chat_id
start_message_template
pause_message_template
resume_message_template
end_message_template
created_at
updated_at
```

Der Telegram Bot Token wird bevorzugt als Umgebungsvariable gespeichert und
nicht in dieser Tabelle abgelegt.

### Tabelle: `workdays`

Ein Datensatz pro Arbeitstag.

```text
id
status
scheduled_start_at
actual_start_at
ended_at
created_at
updated_at
```

Mögliche Statuswerte:

```text
planned
working
paused
finished
cancelled
```

### Tabelle: `work_sessions`

Zeitblöcke innerhalb eines Arbeitstags.

```text
id
workday_id
type
started_at
ended_at
created_at
updated_at
```

Mögliche Session-Typen:

```text
work
break
```

Beispiel mit einer Pause:

```text
work → break → work
```

Nur `work`-Sessions werden im Clockify-Export berücksichtigt.

### Tabelle: `tasks`

Einzeilige Aufgaben innerhalb einer Work-Session.

```text
id
work_session_id
content
created_at
updated_at
```

### Tabelle: `telegram_messages`

Protokoll für geplante, versendete und fehlgeschlagene Telegram-Nachrichten.

```text
id
workday_id
type
content
scheduled_for
sent_at
status
error_message
created_at
updated_at
```

Mögliche Statuswerte:

```text
pending
sent
failed
cancelled
```

---

## Zustandsmaschine

Erlaubte Übergänge:

```text
kein Arbeitstag
  → planned
  → working
  → paused
  → working
  → paused
  → working
  → finished
```

Aktionen:

```text
kein Arbeitstag + Arbeit starten  → planned
planned + Startzeit erreicht      → working
working + Pause starten           → paused
paused + Arbeit fortsetzen        → working
working + Arbeit beenden          → finished
planned + Abbrechen               → cancelled
```

Ungültige Zustände verhindern:

- Keine Pause, wenn keine Arbeit läuft.
- Keine Aufgaben während einer Pause.
- Kein Fortsetzen ohne aktive Pause.
- Keine parallelen offenen Arbeitstage.
- Keine zweite offene Work-Session.
- Kein Bearbeiten abgeschlossener Arbeitstage ohne spätere explizite Funktion.

---

## Projektstruktur

```text
.
├── .agents/
│   ├── adhd-design-expert/
│   ├── caveman/
│   └── i-have-adhd/
│
├── app/
│   ├── (app)/
│   │   ├── page.tsx
│   │   ├── history/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   │
│   ├── api/
│   │   ├── workdays/
│   │   ├── sessions/
│   │   ├── tasks/
│   │   ├── telegram/
│   │   └── cron/
│   │
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── dashboard/
│   │   ├── clockify-export-dialog.tsx
│   │   ├── start-work-dialog.tsx
│   │   ├── task-entry-form.tsx
│   │   ├── task-list.tsx
│   │   ├── work-actions.tsx
│   │   ├── work-status-card.tsx
│   │   └── work-timer.tsx
│   │
│   ├── settings/
│   │   ├── message-template-form.tsx
│   │   └── telegram-settings-form.tsx
│   │
│   └── ui/
│
├── lib/
│   ├── db.ts
│   ├── telegram.ts
│   ├── message-templates.ts
│   ├── clockify-export.ts
│   ├── time.ts
│   └── validations/
│
├── prisma/
│   └── schema.prisma
│
├── scripts/
│   └── telegram-worker.ts
│
├── types/
│   └── index.ts
│
├── .env.example
├── AGENTS.md
└── BAUPLAN.md
```

---

## Entwicklungsregeln

- TypeScript strict mode verwenden.
- Datenbankoperationen ausschließlich serverseitig ausführen.
- Server Actions oder Route Handlers für Mutationen nutzen.
- Alle Eingaben mit Zod validieren.
- Zeiten in UTC speichern.
- Zeiten für Anzeige und Export in `Europe/Berlin` formatieren.
- shadcn/ui und Base UI konsistent einsetzen.
- Keine sensitiven Werte an Client-Komponenten übergeben.
- Keine Browser-Timer als alleinige Lösung für geplante Nachrichten.
- Auto-Save für Aufgaben priorisieren.
- Jede Mutation benötigt verständliche Fehlerzustände.
- Erst MVP umsetzen, dann erweitern und refactoren.

---

## Umgebungsvariablen

```bash
DATABASE_URL="mysql://root:root@localhost:3306/adhdworker"
TELEGRAM_BOT_TOKEN=""
APP_TIMEZONE="Europe/Berlin"
```

Beispiel für `.env.example`:

```bash
DATABASE_URL="mysql://root:root@localhost:3306/adhdworker"
TELEGRAM_BOT_TOKEN="replace-me"
APP_TIMEZONE="Europe/Berlin"
```

---

## Nicht Teil des ersten MVP

```text
Direkte Clockify API Integration
Mehrbenutzerfähigkeit
Authentifizierung
Mobile App
KI-Zusammenfassungen
Wochen- und Monatsauswertungen
Projekt- und Kundenverwaltung
Offline-Synchronisierung
```

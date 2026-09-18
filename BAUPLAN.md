## Ziel

Ein lokales MVP bauen, mit dem ein vollständiger Arbeitstag dokumentiert wird.

Der Nutzer kann:

1. Einen Arbeitstag für eine Uhrzeit planen.
2. Aufgaben während aktiver Arbeit erfassen.
3. Eine Pause starten.
4. Arbeit fortsetzen.
5. Arbeit beenden.
6. Telegram-Nachrichten auslösen.
7. Clockify-kompatible Zeitblöcke kopieren.

Grundsatz:

```text
MariaDB ist die Wahrheit.
Telegram ist eine Ausgabe.
Clockify ist zunächst nur ein Exportformat.
```

---

## Phase 0 — Projekt vorbereiten

### Aufgaben

- Vorhandenes Next.js-Projekt prüfen.
- App Router und TypeScript verwenden.
- Tailwind CSS prüfen.
- shadcn/ui und Base UI verfügbar machen.
- `.agents/`-Skills bei jeder Design- und Architekturentscheidung beachten.
- `AGENTS.md` in den Projektstamm kopieren.
- Diese Datei als `BAUPLAN.md` in den Projektstamm kopieren.
- `.env.example` anlegen.
- `.env` anlegen und sicherstellen, dass sie in `.gitignore` steht.

### Ergebnis

Das Projekt startet fehlerfrei und die Projektregeln sind dokumentiert.

---

## Phase 1 — MariaDB und Prisma einrichten

### Ziel

MariaDB mit Prisma verbinden und das Kernschema migrieren.

### Lokale MariaDB-Daten

```text
Host: localhost
Port: 3306
Username: root
Password: root
Datenbank: adhdworker
```

### Datenbank erstellen

```sql
CREATE DATABASE IF NOT EXISTS adhdworker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### Pakete installieren

```bash
npm install @prisma/client zod date-fns date-fns-tz
npm install -D prisma tsx
```

Optional für Formulare:

```bash
npm install react-hook-form @hookform/resolvers
```

### Prisma initialisieren

```bash
npx prisma init
```

### `.env` konfigurieren

```bash
DATABASE_URL="mysql://root:root@localhost:3306/adhdworker"
APP_TIMEZONE="Europe/Berlin"
```

### Prisma-Modelle erstellen

Erstelle Modelle für:

```text
Settings
Workday
WorkSession
Task
TelegramMessage
```

### Migration erzeugen

```bash
npx prisma migrate dev --name init_adhdworker
npx prisma generate
```

### Abnahme

- MariaDB enthält alle benötigten Tabellen.
- Prisma verbindet sich erfolgreich.
- Prisma Studio startet.

```bash
npx prisma studio
```

---

## Phase 2 — Serverlogik erstellen

### Ziel

Die Statuslogik soll unabhängig von der Benutzeroberfläche funktionieren.

### Dateien

```text
lib/
├── db.ts
├── time.ts
├── clockify-export.ts
├── message-templates.ts
└── validations/
```

### Benötigte Funktionen

#### Arbeitstag

```text
getCurrentWorkday()
createPlannedWorkday()
startScheduledWorkday()
pauseWorkday()
resumeWorkday()
finishWorkday()
cancelPlannedWorkday()
```

#### Aufgaben

```text
createTask()
updateTask()
deleteTask()
getTasksForSession()
```

#### Clockify

```text
formatClockifyTime()
createClockifyExport()
```

### Regeln

- Maximal ein offener Workday.
- Maximal eine aktive Work-Session.
- Aufgaben nur in einer offenen Work-Session erlauben.
- Beim Pausieren:
  - Work-Session schließen.
  - Break-Session erstellen.
  - Workday auf `paused` setzen.
- Beim Fortsetzen:
  - Break-Session schließen.
  - Neue Work-Session erstellen.
  - Workday auf `working` setzen.
- Beim Beenden:
  - Offene Work-Session schließen.
  - Workday auf `finished` setzen.
- Zeitpunkte in UTC speichern.
- Anzeige und Export in `Europe/Berlin` formatieren.

### Abnahme

Alle Funktionen sind über Server Actions oder Route Handlers testbar, ohne dass
das Dashboard bereits fertig sein muss.

---

## Phase 3 — Dashboard und Arbeitsablauf

### Ziel

Den vollständigen Ablauf ohne Telegram nutzbar machen.

### Dashboard-Status

#### Kein Arbeitstag

Anzeige:

```text
Heute noch nicht gestartet.
```

Hauptaktion:

```text
Arbeit starten
```

#### Arbeit geplant

Anzeige:

```text
Arbeitsstart geplant für 08:45.
```

Aktionen:

```text
Planung bearbeiten
Planung abbrechen
```

#### Arbeit läuft

Anzeige:

```text
Arbeit läuft
Gestartet: 08:45
Nettozeit: 02:15
```

Aktionen:

```text
Aufgabe hinzufügen
Pause starten
Arbeit beenden
```

#### Pause läuft

Anzeige:

```text
Pause läuft
Pausenbeginn: 12:00
```

Hauptaktion:

```text
Arbeit fortsetzen
```

#### Arbeit beendet

Anzeige:

```text
Arbeitstag abgeschlossen.
```

Aktionen:

```text
Clockify-Export öffnen
Neuen Arbeitstag starten
```

### Komponenten

```text
components/dashboard/
├── work-status-card.tsx
├── work-timer.tsx
├── work-actions.tsx
├── start-work-dialog.tsx
├── task-entry-form.tsx
├── task-list.tsx
└── clockify-export-dialog.tsx
```

### UX-Regeln

- Eine primäre Aktion pro Status.
- Statuskarte immer oben anzeigen.
- Aufgaben ohne unnötige Dialoge hinzufügen.
- Fokus nach dem Speichern im Aufgabenfeld behalten.
- Auto-Save verwenden.
- Lösch- und Bearbeitungsaktionen einfach halten.
- Arbeit beenden kurz bestätigen.
- Keine Einstellungen auf dem Hauptscreen überladen anzeigen.

### Abnahme

Ein Arbeitstag kann komplett durchgespielt werden:

```text
Planen → Arbeiten → Aufgaben → Pause → Fortsetzen → Aufgaben → Beenden
```

Die Daten bleiben nach einem Browser-Reload erhalten.

---

## Phase 4 — Clockify-Export

### Ziel

Pro Arbeitsphase einen kopierbaren Clockify-Block erstellen.

### Regeln

Für jede Work-Session:

1. Aufgaben der Session abrufen.
2. Aufgaben mit `, ` verbinden.
3. Startzeit und Endzeit als `HHmm` formatieren.
4. Eine Exportzeile erzeugen.

### Beispiel

```text
Ticket XY erledigt, Login-Bug behoben | 0845 1200
Admin-Bereich angepasst, Code Review durchgeführt | 1230 1715
```

### Exportdialog

Anzeigen:

- Datum.
- Nettoarbeitszeit.
- Eine Zeile je Work-Session.
- Kopier-Button je Zeile.
- Button zum Kopieren des gesamten Exports.
- Hinweis bei Sessions ohne Aufgaben.

### Abnahme

Der Nutzer kann nach Tagesende alle Clockify-Zeilen mit einem Klick kopieren.

---

## Phase 5 — Einstellungen

### Ziel

Wiederkehrende Werte nur einmal konfigurieren.

### Route

```text
/settings
```

### Einstellungen

```text
Standard-Startzeit
Telegram-Chat-ID
Startnachricht
Pausennachricht
Fortsetzungsnachricht
Abschlussnachricht
Zeitzone
```

### Standardvorlagen

Start:

```text
Guten Morgen, ich bin ab {startTime} da.
```

Pause:

```text
Mache jetzt Pause.

Erledigt:
{tasks}
```

Fortsetzen:

```text
Bin wieder da.
```

Ende:

```text
Für heute fertig.

Erledigt:
{tasks}
```

### Abnahme

Der Startdialog nutzt die gespeicherten Standardwerte automatisch.

---

## Phase 6 — Telegram sofort senden

### Ziel

Nachrichten für Pause, Fortsetzen und Ende direkt per Telegram senden.

### Vorbereitung

1. Bot über `@BotFather` erstellen.
2. Bot dem Gruppenchat hinzufügen.
3. Schreibrechte sicherstellen.
4. Gruppen-Chat-ID ermitteln.
5. Token in `.env` eintragen.

```bash
TELEGRAM_BOT_TOKEN="replace-me"
```

### Telegram-Client

Datei:

```text
lib/telegram.ts
```

Funktionen:

```text
sendTelegramMessage()
sendStartMessage()
sendPauseMessage()
sendResumeMessage()
sendEndMessage()
```

### Versandablauf

1. Nachricht aus Vorlage erzeugen.
2. `TelegramMessage` mit Status `pending` erstellen.
3. Nachricht per Telegram Bot API senden.
4. Bei Erfolg Status auf `sent` setzen.
5. Bei Fehler Status auf `failed` setzen.
6. Fehlermeldung speichern.

### UI

- Versandstatus sichtbar machen.
- Telegram-Fehler klar erklären.
- Bei Fehler Button `Erneut senden` anzeigen.
- Niemals Telegram-Token im Browser ausliefern.

### Abnahme

Pause, Fortsetzen und Beenden erzeugen die passende Telegram-Nachricht und
protokollieren Erfolg oder Fehler.

---

## Phase 7 — Verzögerter Arbeitsstart und Startnachricht

### Ziel

Die Startnachricht wird beim Planen sofort gesendet. Die Arbeitszeit beginnt zur
geplanten Zeit, auch wenn der Browser geschlossen ist.

### Ablauf beim Planen

Beim Klick auf `Arbeit starten`:

1. Workday mit Status `planned` erstellen.
2. `scheduled_start_at` in UTC speichern.
3. Telegram-Nachricht vom Typ `start` mit Status `pending` anlegen.
4. `scheduled_for` auf den aktuellen Zeitpunkt setzen.
5. Die Startnachricht sofort versenden.

### Worker

Datei:

```text
scripts/telegram-worker.ts
```

Der Worker prüft regelmäßig fällige Arbeitstage:

```text
workdays
WHERE status = planned
AND scheduled_start_at <= now
```

Für jeden fälligen Arbeitstag:

1. Prüfen, ob der Workday noch `planned` ist.
2. Workday auf `working` setzen.
3. Erste Work-Session ab `scheduled_start_at` erstellen.

Ausstehende Telegram-Nachrichten werden unabhängig davon verarbeitet.

### Lokal ausführen

```bash
npx tsx scripts/telegram-worker.ts
```

### Sonderfälle

- Startzeit liegt in der Vergangenheit:
  - Sofort starten oder explizit bestätigen lassen.
- Planung wird abgebrochen:
  - Workday auf `cancelled`.
  - Geplante Nachricht auf `cancelled`.
- Telegram schlägt fehl:
  - Workday trotzdem starten.
  - Nachricht als `failed` markieren.
  - Erneuten Versand ermöglichen.
- Worker startet doppelt:
  - Doppelten Versand durch atomare Statusupdates verhindern.

### Abnahme

Die Startnachricht wird sofort gesendet. Die erste Work-Session startet zur
geplanten Uhrzeit, ohne dass der Browser geöffnet sein muss.

---

## Phase 8 — Verlauf

### Ziel

Vergangene Arbeitstage, Exporte und Telegram-Nachrichten wiederfinden.

### Route

```text
/history
```

### Funktionen

- Abgeschlossene Arbeitstage auflisten.
- Datum, Nettoarbeitszeit und Aufgabenanzahl anzeigen.
- Detailansicht pro Arbeitstag.
- Clockify-Export erneut öffnen.
- Telegram-Versandprotokoll anzeigen.
- Fehlgeschlagene Nachrichten erneut senden.

### Später

Erst nach stabilem MVP ergänzen:

```text
Aufgaben nachträglich bearbeiten
Session-Zeiten manuell ändern
Arbeitstage korrigieren
```

### Abnahme

Kein Export, keine Aufgabe und kein Nachrichtenprotokoll geht verloren.

---

## Definition of Done

Das MVP ist fertig, wenn dieser Ablauf funktioniert:

1. Standardwerte und Nachrichtenvorlagen speichern.
2. Arbeitstag für eine Uhrzeit planen.
3. Beim Planen Startnachricht sofort senden.
4. Arbeit zur geplanten Zeit beginnen.
5. Mehrere Aufgaben erfassen.
6. Pause starten.
7. Pausennachricht mit Aufgaben der ersten Work-Session senden.
8. Arbeit fortsetzen.
9. Fortsetzungsnachricht senden.
10. Weitere Aufgaben erfassen.
11. Arbeit beenden.
12. Abschlussnachricht mit Aufgaben der letzten Work-Session senden.
13. Clockify-Export im Format `HHmm HHmm` erzeugen.
14. Gesamten Export kopieren.
15. Daten nach Browser-Reload behalten.
16. Fehlgeschlagene Telegram-Nachrichten sichtbar machen und erneut senden.

---

## Nach dem MVP

```text
Clockify API Integration
Automatisches Erstellen von Clockify Time Entries
Wochen- und Monatsübersicht
Erinnerungen bei offenem Arbeitstag
Projekt- und Kundenverwaltung
Ticket-Verknüpfungen
Authentifizierung
Mehrbenutzerfähigkeit
Deployment mit sicherem Cronjob oder Worker
```

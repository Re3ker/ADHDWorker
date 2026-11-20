import { pickReminder } from "../shared/reminder-logic"
import type { ActionType } from "../shared/schemas"
import { dateKey } from "../shared/time"
import type { ReminderData } from "../shared/types"
import { getSettings } from "./settings-service"
import { getCurrentWorkday, hasStartedToday } from "./workday-service"

// Bewusst nur im Speicher: Nach einem Neustart erinnert die App lieber erneut.
const snoozedUntil = new Map<ActionType, number>()
const skippedOn = new Map<ActionType, string>()

export function snoozeReminder(type: ActionType, minutes = 5) {
  snoozedUntil.set(type, Date.now() + minutes * 60_000)
}

export function skipReminderToday(type: ActionType) {
  skippedOn.set(type, dateKey())
}

export function unskipReminder(type: ActionType) {
  skippedOn.delete(type)
  snoozedUntil.delete(type)
}

/** Für heute abgeschaltete Erinnerungen, z. B. Feierabend bei Überstunden. */
export function skippedToday(now = new Date()): ActionType[] {
  const today = dateKey(now)
  return [...skippedOn].filter(([, day]) => day === today).map(([type]) => type)
}

/** Aktuell fällige Erinnerung mit den Daten aus SQLite und dem Speicher. */
export async function currentReminder(
  now = new Date()
): Promise<ReminderData | null> {
  const [settings, workday, startedToday] = await Promise.all([
    getSettings(),
    getCurrentWorkday(),
    hasStartedToday(now),
  ])
  const reminder = pickReminder(now, settings, workday, {
    startedToday,
    skipped: skippedToday(now),
    snoozedUntil: Object.fromEntries(snoozedUntil),
  })
  return reminder
    ? { type: reminder.type, dueAt: reminder.dueAt.toISOString() }
    : null
}

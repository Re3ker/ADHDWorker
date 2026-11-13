import { computeDayPlan } from "../shared/day-plan"
import type { ActionType } from "../shared/schemas"
import { addMinutes, dateKey, isWeekday, todayAt } from "../shared/time"
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

/**
 * Welche Erinnerung ist gerade fällig? Sichtbar ab Ziel-Uhrzeit − Vorlauf,
 * bis reagiert wurde. Die Anmelde-Erinnerung kommt nur Mo–Fr.
 */
export async function currentReminder(
  now = new Date()
): Promise<ReminderData | null> {
  const [settings, workday] = await Promise.all([
    getSettings(),
    getCurrentWorkday(),
  ])
  if (workday?.pendingAction) return null

  const today = dateKey(now)
  const isSkipped = (type: ActionType) => skippedOn.get(type) === today
  let candidate: { type: ActionType; dueAt: Date } | null = null

  if (!workday) {
    if (!isWeekday(now) || isSkipped("start") || (await hasStartedToday(now))) {
      return null
    }
    candidate = { type: "start", dueAt: todayAt(settings.startTime, now) }
  } else {
    const plan = computeDayPlan(now, settings, workday)
    const hadBreak = workday.sessions.some(
      (session) => session.type === "break"
    )
    if (workday.status === "working") {
      candidate =
        hadBreak || isSkipped("pause")
          ? { type: "end", dueAt: plan.endAt }
          : { type: "pause", dueAt: plan.pauseAt }
    } else if (workday.status === "paused") {
      candidate = { type: "resume", dueAt: plan.resumeAt }
    }
  }

  if (!candidate || isSkipped(candidate.type)) return null
  if ((snoozedUntil.get(candidate.type) ?? 0) > now.getTime()) return null
  if (now < addMinutes(candidate.dueAt, -settings.leadMinutes)) return null
  return { type: candidate.type, dueAt: candidate.dueAt.toISOString() }
}

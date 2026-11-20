import { computeDayPlan, type PlanSettings, type PlanWorkday } from "./day-plan"
import type { ActionType } from "./schemas"
import { addMinutes, isWeekday, todayAt } from "./time"

export type ReminderWorkday = PlanWorkday & {
  status: string
  pendingAction: string | null
}

export type ReminderState = {
  /** Wurde heute schon gearbeitet? Dann keine Anmelde-Erinnerung mehr. */
  startedToday: boolean
  /** Für heute abgeschaltet (z. B. „Heute frei“, „Überstunden“). */
  skipped: ActionType[]
  /** Schlummern bis (ms seit Epoch) pro Erinnerung. */
  snoozedUntil: Partial<Record<ActionType, number>>
}

/**
 * Welche Erinnerung ist gerade fällig? Sichtbar ab Ziel-Uhrzeit − Vorlauf,
 * bis reagiert wurde. Die Anmelde-Erinnerung kommt nur Mo–Fr.
 * Rein und ohne Datenbank, damit sie einfach testbar ist.
 */
export function pickReminder(
  now: Date,
  settings: PlanSettings,
  workday: ReminderWorkday | null,
  state: ReminderState
): { type: ActionType; dueAt: Date } | null {
  if (workday?.pendingAction) return null
  const isSkipped = (type: ActionType) => state.skipped.includes(type)
  let candidate: { type: ActionType; dueAt: Date } | null = null

  if (!workday) {
    if (!isWeekday(now) || isSkipped("start") || state.startedToday) {
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
  if ((state.snoozedUntil[candidate.type] ?? 0) > now.getTime()) return null
  if (now < addMinutes(candidate.dueAt, -settings.leadMinutes)) return null
  return candidate
}

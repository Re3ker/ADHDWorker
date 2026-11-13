import { addMinutes, minutesBetween, todayAt } from "./time"

export type PlanSettings = {
  startTime: string
  pauseTime: string
  pauseMinutes: number
  targetWorkMinutes: number
  leadMinutes: number
}

type DateLike = Date | string

export type PlanWorkday = {
  scheduledStartAt: DateLike | null
  actualStartAt: DateLike | null
  endedAt: DateLike | null
  plannedPauseAt: DateLike | null
  pauseMinutes: number | null
  sessions: Array<{
    type: string
    startedAt: DateLike
    endedAt: DateLike | null
  }>
}

export type DayPlan = {
  startAt: Date
  pauseAt: Date
  resumeAt: Date
  endAt: Date
  pauseMinutes: number
  netMinutes: number
  remainingMinutes: number
}

/**
 * Start und Pause sind flexibel. Der Feierabend ergibt sich immer aus
 * Start + Soll-Arbeitszeit + (tatsächlicher bzw. geplanter) Pausenzeit.
 */
export function computeDayPlan(
  now: Date,
  settings: PlanSettings,
  workday: PlanWorkday | null
): DayPlan {
  const pauseMinutes = workday?.pauseMinutes ?? settings.pauseMinutes
  const startAt = new Date(
    workday?.actualStartAt ??
      workday?.scheduledStartAt ??
      todayAt(settings.startTime, now)
  )
  const sessions = workday?.sessions ?? []
  const breaks = sessions.filter((session) => session.type === "break")
  const openBreak = breaks.find((session) => !session.endedAt)
  const firstBreak = breaks[0]

  const pauseAt = new Date(
    firstBreak?.startedAt ??
      workday?.plannedPauseAt ??
      todayAt(settings.pauseTime, now)
  )
  const resumeAt = openBreak
    ? addMinutes(openBreak.startedAt, pauseMinutes)
    : firstBreak?.endedAt
      ? new Date(firstBreak.endedAt)
      : addMinutes(pauseAt, pauseMinutes)

  // Noch keine Pause gemacht → geplante Pause einrechnen.
  let breakMinutes = breaks.length === 0 ? pauseMinutes : 0
  for (const session of breaks) {
    const duration = minutesBetween(session.startedAt, session.endedAt ?? now)
    breakMinutes += session.endedAt
      ? duration
      : Math.max(duration, pauseMinutes)
  }

  const netMinutes = sessions
    .filter((session) => session.type === "work")
    .reduce(
      (sum, session) =>
        sum + minutesBetween(session.startedAt, session.endedAt ?? now),
      0
    )

  const endAt = workday?.endedAt
    ? new Date(workday.endedAt)
    : addMinutes(startAt, settings.targetWorkMinutes + breakMinutes)

  return {
    startAt,
    pauseAt,
    resumeAt,
    endAt,
    pauseMinutes,
    netMinutes: Math.max(0, Math.floor(netMinutes)),
    remainingMinutes: Math.max(
      0,
      Math.ceil(settings.targetWorkMinutes - netMinutes)
    ),
  }
}

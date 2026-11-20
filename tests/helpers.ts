import { fromZonedTime } from "date-fns-tz"

import type { PlanSettings } from "../src/shared/day-plan"
import { APP_TIMEZONE } from "../src/shared/time"

/** 2026-11-16 ist ein Montag, 2026-11-21 ein Samstag. */
export const MONDAY = "2026-11-16"
export const SATURDAY = "2026-11-21"

/** Berliner Uhrzeit an einem Testtag als Date. */
export function berlin(time: string, day = MONDAY) {
  return fromZonedTime(`${day}T${time}:00`, APP_TIMEZONE)
}

export const settings: PlanSettings = {
  startTime: "08:45",
  pauseTime: "12:00",
  pauseMinutes: 30,
  targetWorkMinutes: 480,
  leadMinutes: 1,
}

type Session = { type: "work" | "break"; from: string; to?: string }

/** Kompakter Arbeitstag für Tests: sessions als Berliner Uhrzeiten. */
export function workday(
  sessions: Session[],
  extra: Partial<{
    status: string
    endedAt: Date | null
    plannedPauseAt: Date | null
    pauseMinutes: number | null
    pendingAction: string | null
  }> = {}
) {
  const mapped = sessions.map((session) => ({
    type: session.type,
    startedAt: berlin(session.from),
    endedAt: session.to ? berlin(session.to) : null,
  }))
  return {
    status: "working",
    scheduledStartAt: null,
    actualStartAt: mapped[0]?.startedAt ?? null,
    endedAt: null,
    plannedPauseAt: null,
    pauseMinutes: null,
    pendingAction: null,
    ...extra,
    sessions: mapped,
  }
}

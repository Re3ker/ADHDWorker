import { describe, expect, it } from "vitest"

import { computeDayPlan } from "../src/shared/day-plan"
import { formatTime } from "../src/shared/time"
import { berlin, settings, workday } from "./helpers"

const times = (plan: ReturnType<typeof computeDayPlan>) => ({
  start: formatTime(plan.startAt),
  pause: formatTime(plan.pauseAt),
  resume: formatTime(plan.resumeAt),
  end: formatTime(plan.endAt),
})

describe("computeDayPlan", () => {
  it("nutzt ohne Arbeitstag die Standardzeiten", () => {
    const plan = computeDayPlan(berlin("07:00"), settings, null)
    expect(times(plan)).toEqual({
      start: "08:45",
      pause: "12:00",
      resume: "12:30",
      end: "17:15",
    })
    expect(plan.netMinutes).toBe(0)
    expect(plan.remainingMinutes).toBe(480)
  })

  it("rechnet die geplante Pause ein, solange noch keine gemacht wurde", () => {
    const day = workday([{ type: "work", from: "09:00" }])
    const plan = computeDayPlan(berlin("10:00"), settings, day)
    expect(times(plan).end).toBe("17:30")
    expect(plan.netMinutes).toBe(60)
    expect(plan.remainingMinutes).toBe(420)
  })

  it("verschiebt den Feierabend bei verspäteter Rückkehr", () => {
    const day = workday([
      { type: "work", from: "09:00", to: "12:30" },
      { type: "break", from: "12:30", to: "13:05" },
      { type: "work", from: "13:05" },
    ])
    const plan = computeDayPlan(berlin("13:10"), settings, day)
    expect(times(plan)).toEqual({
      start: "09:00",
      pause: "12:30",
      resume: "13:05",
      end: "17:35",
    })
  })

  it("zählt eine laufende Pause mindestens mit der geplanten Dauer", () => {
    const day = workday(
      [
        { type: "work", from: "09:00", to: "12:00" },
        { type: "break", from: "12:00" },
      ],
      { status: "paused" }
    )
    expect(times(computeDayPlan(berlin("12:10"), settings, day)).end).toBe(
      "17:30"
    )
    expect(times(computeDayPlan(berlin("12:45"), settings, day)).end).toBe(
      "17:45"
    )
    expect(times(computeDayPlan(berlin("12:10"), settings, day)).resume).toBe(
      "12:30"
    )
  })

  it("nutzt die heutige Pausenzeit und -dauer", () => {
    const day = workday([{ type: "work", from: "08:45" }], {
      plannedPauseAt: berlin("12:30"),
      pauseMinutes: 45,
    })
    const plan = computeDayPlan(berlin("09:00"), settings, day)
    expect(times(plan)).toMatchObject({
      pause: "12:30",
      resume: "13:15",
      end: "17:30",
    })
  })

  it("nimmt bei beendetem Tag das echte Ende", () => {
    const day = workday(
      [
        { type: "work", from: "09:00", to: "12:00" },
        { type: "break", from: "12:00", to: "12:30" },
        { type: "work", from: "12:30", to: "18:00" },
      ],
      { status: "finished", endedAt: berlin("18:00") }
    )
    const plan = computeDayPlan(berlin("20:00"), settings, day)
    expect(times(plan).end).toBe("18:00")
    expect(plan.netMinutes).toBe(510)
    expect(plan.remainingMinutes).toBe(0)
  })
})

import { describe, expect, it } from "vitest"

import { pickReminder, type ReminderState } from "../src/shared/reminder-logic"
import { formatTime } from "../src/shared/time"
import { berlin, SATURDAY, settings, workday } from "./helpers"

const fresh: ReminderState = {
  startedToday: false,
  skipped: [],
  snoozedUntil: {},
}

function pick(
  now: Date,
  day: ReturnType<typeof workday> | null,
  state = fresh
) {
  const result = pickReminder(now, settings, day, state)
  return result ? `${result.type}@${formatTime(result.dueAt)}` : null
}

describe("pickReminder – Anmelden", () => {
  it("erinnert eine Minute vorher", () => {
    expect(pick(berlin("08:43"), null)).toBeNull()
    expect(pick(berlin("08:44"), null)).toBe("start@08:45")
    expect(pick(berlin("09:30"), null)).toBe("start@08:45")
  })

  it("schweigt am Wochenende, nach der Arbeit und bei „Heute frei“", () => {
    expect(pick(berlin("08:44", SATURDAY), null)).toBeNull()
    expect(
      pick(berlin("08:44"), null, { ...fresh, startedToday: true })
    ).toBeNull()
    expect(
      pick(berlin("08:44"), null, { ...fresh, skipped: ["start"] })
    ).toBeNull()
  })

  it("respektiert „In 5 Min erinnern“", () => {
    const state = {
      ...fresh,
      snoozedUntil: { start: berlin("08:49").getTime() },
    }
    expect(pick(berlin("08:46"), null, state)).toBeNull()
    expect(pick(berlin("08:50"), null, state)).toBe("start@08:45")
  })
})

describe("pickReminder – während des Tages", () => {
  const morning = workday([{ type: "work", from: "08:45" }])

  it("erinnert an die Pause, dann nach der Pause an den Feierabend", () => {
    expect(pick(berlin("11:58"), morning)).toBeNull()
    expect(pick(berlin("11:59"), morning)).toBe("pause@12:00")

    const afternoon = workday([
      { type: "work", from: "08:45", to: "12:00" },
      { type: "break", from: "12:00", to: "12:30" },
      { type: "work", from: "12:30" },
    ])
    expect(pick(berlin("17:13"), afternoon)).toBeNull()
    expect(pick(berlin("17:14"), afternoon)).toBe("end@17:15")
  })

  it("erinnert in der Pause ans Wiederanmelden", () => {
    const paused = workday(
      [
        { type: "work", from: "08:45", to: "12:10" },
        { type: "break", from: "12:10" },
      ],
      { status: "paused" }
    )
    expect(pick(berlin("12:38"), paused)).toBeNull()
    expect(pick(berlin("12:39"), paused)).toBe("resume@12:40")
  })

  it("springt bei „Heute keine Pause“ direkt zum Feierabend", () => {
    expect(
      pick(berlin("17:14"), morning, { ...fresh, skipped: ["pause"] })
    ).toBe("end@17:15")
  })

  it("schweigt bei Überstunden und vorgemerkter Aktion", () => {
    expect(
      pick(berlin("18:00"), morning, { ...fresh, skipped: ["pause", "end"] })
    ).toBeNull()
    const pending = workday([{ type: "work", from: "08:45" }], {
      pendingAction: "pause",
    })
    expect(pick(berlin("11:59"), pending)).toBeNull()
  })
})

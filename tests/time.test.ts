import { describe, expect, it } from "vitest"

import {
  formatClock,
  formatDuration,
  isWeekday,
  shiftTime,
  todayAt,
} from "../src/shared/time"
import { berlin, MONDAY, SATURDAY } from "./helpers"

describe("Zeit-Helfer", () => {
  it("formatiert Dauer und Kopierformat", () => {
    expect(formatDuration(0)).toBe("0:00 h")
    expect(formatDuration(485.9)).toBe("8:05 h")
    expect(formatClock(berlin("08:45"))).toBe("0845")
  })

  it("verschiebt Uhrzeiten über Mitternacht", () => {
    expect(shiftTime("08:45", 15)).toBe("09:00")
    expect(shiftTime("23:50", 20)).toBe("00:10")
    expect(shiftTime("00:10", -20)).toBe("23:50")
  })

  it("rechnet Berliner Uhrzeiten in UTC um (Winter- und Sommerzeit)", () => {
    expect(todayAt("08:45", berlin("12:00", MONDAY)).toISOString()).toBe(
      "2026-11-16T07:45:00.000Z"
    )
    expect(todayAt("08:45", berlin("12:00", "2026-07-06")).toISOString()).toBe(
      "2026-07-06T06:45:00.000Z"
    )
  })

  it("erkennt Werktage", () => {
    expect(isWeekday(berlin("09:00", MONDAY))).toBe(true)
    expect(isWeekday(berlin("09:00", SATURDAY))).toBe(false)
  })
})

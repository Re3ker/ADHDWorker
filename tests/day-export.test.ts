import { describe, expect, it } from "vitest"

import {
  createDayBlocks,
  exportPart,
  netWorkMinutes,
  partLabel,
} from "../src/shared/day-export"
import { berlin } from "./helpers"

const session = (id: string, type: string, from: string, to?: string) => ({
  id,
  type,
  startedAt: berlin(from),
  endedAt: to ? berlin(to) : null,
})

describe("createDayBlocks", () => {
  const sessions = [
    session("a", "work", "08:45", "12:00"),
    session("b", "break", "12:00", "12:30"),
    session("c", "work", "12:30", "17:15"),
  ]

  it("liefert pro Arbeitsabschnitt Aufgaben, Start und Ende im Format 0845", () => {
    const blocks = createDayBlocks(sessions, [
      { part: 0, content: "Tickets" },
      { part: 1, content: "Review" },
      { part: 0, content: "Nachtrag" },
    ])
    expect(blocks).toEqual([
      {
        id: "a",
        label: "Vor der Pause",
        tasks: "Tickets, Nachtrag",
        start: "0845",
        end: "1200",
      },
      {
        id: "c",
        label: "Nach der Pause",
        tasks: "Review",
        start: "1230",
        end: "1715",
      },
    ])
  })

  it("legt Aufgaben ohne passenden Abschnitt in den letzten Block", () => {
    const blocks = createDayBlocks(
      [session("a", "work", "08:45", "17:00")],
      [
        { part: 0, content: "Vormittag" },
        { part: 1, content: "Vorab notiert" },
      ]
    )
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({
      label: "Arbeitstag",
      tasks: "Vormittag, Vorab notiert",
    })
  })

  it("lässt laufende Abschnitte weg", () => {
    const blocks = createDayBlocks([session("a", "work", "08:45")], [])
    expect(blocks).toEqual([])
  })
})

describe("Hilfen", () => {
  it("benennt Abschnitte", () => {
    expect([0, 1, 2].map(partLabel)).toEqual([
      "Vor der Pause",
      "Nach der Pause",
      "Abschnitt 3",
    ])
  })

  it("begrenzt den Export-Abschnitt auf vorhandene Blöcke", () => {
    expect(exportPart(1, 1)).toBe(0)
    expect(exportPart(1, 2)).toBe(1)
    expect(exportPart(0, 0)).toBe(0)
  })

  it("summiert nur beendete Arbeitszeit", () => {
    const minutes = netWorkMinutes([
      session("a", "work", "08:45", "12:00"),
      session("b", "break", "12:00", "12:30"),
      session("c", "work", "12:30", "13:00"),
      session("d", "work", "13:00"),
    ])
    expect(minutes).toBe(225)
  })
})

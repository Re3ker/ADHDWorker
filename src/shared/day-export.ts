import { formatClock, minutesBetween } from "./time"

type ExportSession = {
  id: string
  type: string
  startedAt: Date | string
  endedAt: Date | string | null
}

type ExportTask = { part: number; content: string }

export type DayBlock = {
  id: string
  label: string
  tasks: string
  start: string
  end: string
}

/** 0 = „Vor der Pause“, 1 = „Nach der Pause“, danach „Abschnitt 3“ … */
export function partLabel(part: number) {
  if (part === 0) return "Vor der Pause"
  if (part === 1) return "Nach der Pause"
  return `Abschnitt ${part + 1}`
}

/**
 * Abschnitt, in dem eine Aufgabe exportiert wird. Aufgaben für einen Abschnitt,
 * den es (noch) nicht gibt – z. B. Tag ohne Pause – landen im letzten.
 */
export function exportPart(part: number, workSessionCount: number) {
  return Math.min(part, Math.max(0, workSessionCount - 1))
}

/** Ein Block pro beendeter Arbeitssession: Aufgaben, Start (0845), Ende. */
export function createDayBlocks(
  sessions: ExportSession[],
  tasks: ExportTask[]
): DayBlock[] {
  const work = sessions.filter(
    (session) => session.type === "work" && session.endedAt
  )
  return work.map((session, index) => ({
    id: session.id,
    label: work.length === 1 ? "Arbeitstag" : partLabel(index),
    tasks: tasks
      .filter((task) => exportPart(task.part, work.length) === index)
      .map((task) => task.content)
      .join(", "),
    start: formatClock(session.startedAt),
    end: formatClock(session.endedAt),
  }))
}

export function netWorkMinutes(sessions: ExportSession[]) {
  const minutes = sessions
    .filter((session) => session.type === "work" && session.endedAt)
    .reduce(
      (sum, session) =>
        sum +
        minutesBetween(session.startedAt, session.endedAt as Date | string),
      0
    )
  return Math.floor(minutes)
}

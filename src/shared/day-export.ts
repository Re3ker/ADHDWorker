import { formatClock, minutesBetween } from "./time"

type ExportSession = {
  id: string
  type: string
  startedAt: Date | string
  endedAt: Date | string | null
  tasks: Array<{ content: string }>
}

export type DayBlock = {
  id: string
  label: string
  tasks: string
  start: string
  end: string
}

function blockLabel(index: number, count: number) {
  if (count === 1) return "Arbeitstag"
  if (count === 2) return index === 0 ? "Vor der Pause" : "Nach der Pause"
  return `Abschnitt ${index + 1}`
}

/** Ein Block pro beendeter Arbeitssession: Aufgaben, Start (0845), Ende. */
export function createDayBlocks(sessions: ExportSession[]): DayBlock[] {
  const work = sessions.filter(
    (session) => session.type === "work" && session.endedAt
  )
  return work.map((session, index) => ({
    id: session.id,
    label: blockLabel(index, work.length),
    tasks: session.tasks.map((task) => task.content).join(", "),
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

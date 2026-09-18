import { formatClock, formatDurationMinutes, durationBetween } from "./time"

export type ExportTask = { content: string }
export type ExportSession = {
  id: string
  type: string
  startedAt: Date | string
  endedAt: Date | string | null
  tasks: ExportTask[]
}

export type ClockifyLine = {
  sessionId: string
  text: string
  taskCount: number
  hasTasks: boolean
}

export function formatClockifyTime(value: Date | string | null | undefined) {
  return formatClock(value)
}

export function createClockifyExport(sessions: ExportSession[]) {
  return sessions
    .filter((session) => session.type === "work" && session.endedAt)
    .map((session) => {
      const taskText = session.tasks.map((task) => task.content).join(", ") || "Ohne Aufgaben"
      return `${taskText} | ${formatClockifyTime(session.startedAt)} ${formatClockifyTime(session.endedAt)}`
    })
    .join("\n")
}

export function createClockifyLines(sessions: ExportSession[]): ClockifyLine[] {
  return sessions
    .filter((session) => session.type === "work" && session.endedAt)
    .map((session) => ({
      sessionId: session.id,
      text: `${session.tasks.map((task) => task.content).join(", ") || "Ohne Aufgaben"} | ${formatClockifyTime(session.startedAt)} ${formatClockifyTime(session.endedAt)}`,
      taskCount: session.tasks.length,
      hasTasks: session.tasks.length > 0,
    }))
}

export function getNetMinutes(sessions: ExportSession[]) {
  return sessions
    .filter((session) => session.type === "work" && session.endedAt)
    .reduce((sum, session) => sum + durationBetween(session.startedAt, session.endedAt as Date | string), 0)
}

export { formatDurationMinutes }

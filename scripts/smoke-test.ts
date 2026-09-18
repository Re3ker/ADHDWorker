import { db } from "@/lib/db"
import { createClockifyExport } from "@/lib/clockify-export"
import { localDateInputValue, localTimeInputValue } from "@/lib/time"
import {
  createPlannedOrImmediateWorkday,
  createTask,
  finishWorkday,
  getCurrentWorkday,
  getWorkdayById,
  pauseWorkday,
  resumeWorkday,
  startScheduledWorkday,
} from "@/lib/workday-service"

let workdayId = ""
let plannedWorkdayId = ""

try {
  const existing = await getCurrentWorkday()
  if (existing) {
    console.log(JSON.stringify({ status: "skipped", reason: "open workday exists" }, null, 2))
  } else {
  const future = new Date(Date.now() + 5 * 60 * 1000)
  const planned = await createPlannedOrImmediateWorkday({ date: localDateInputValue(future), time: localTimeInputValue(future) })
  plannedWorkdayId = planned.workday.id
  if (planned.startsImmediately || planned.workday.status !== "planned") throw new Error("future workday started too early")
  if (planned.message.scheduledFor.getTime() > Date.now() + 2_000) throw new Error("start message was not scheduled immediately")
  if (await startScheduledWorkday(plannedWorkdayId)) throw new Error("scheduled workday started before its time")
  await db.workday.update({ where: { id: plannedWorkdayId }, data: { scheduledStartAt: new Date(Date.now() - 1_000) } })
  const started = await startScheduledWorkday(plannedWorkdayId)
  if (!started || started.status !== "working" || started.sessions.length !== 1) throw new Error("due workday did not start")
  await db.workday.delete({ where: { id: plannedWorkdayId } })
  plannedWorkdayId = ""

  const created = await createPlannedOrImmediateWorkday({ date: localDateInputValue(), time: localTimeInputValue() })
  workdayId = created.workday.id
  if (created.message.scheduledFor.getTime() > Date.now() + 2_000) throw new Error("immediate start message was not due now")
  let current = await getCurrentWorkday()
  if (!current) throw new Error("current workday missing")
  const firstSession = current.sessions.find((session) => session.type === "work" && !session.endedAt)
  if (!firstSession) throw new Error("first work session missing")
  await createTask({ workSessionId: firstSession.id, content: "DB-Ablauftest" })
  await pauseWorkday()
  await resumeWorkday()
  current = await getCurrentWorkday()
  if (!current) throw new Error("resumed workday missing")
  const secondSession = current.sessions.find((session) => session.type === "work" && !session.endedAt)
  if (!secondSession) throw new Error("second work session missing")
  await createTask({ workSessionId: secondSession.id, content: "Export-Ablauftest" })
  await finishWorkday()
  const finished = await getWorkdayById(workdayId)
  if (!finished) throw new Error("finished workday missing")
  console.log(JSON.stringify({
    status: finished.status,
    sessions: finished.sessions.length,
    tasks: finished.sessions.flatMap((session) => session.tasks).length,
    export: createClockifyExport(finished.sessions),
  }, null, 2))
  }
} finally {
  if (workdayId) await db.workday.delete({ where: { id: workdayId } })
  if (plannedWorkdayId) await db.workday.delete({ where: { id: plannedWorkdayId } })
  await db.$disconnect()
}

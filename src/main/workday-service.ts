import type { Prisma, PrismaClient } from "@prisma/client"

import { getDb } from "./db"
import { zonedLocalDateTime, formatDate, formatTime } from "../shared/time"
import { DEFAULT_TEMPLATES, renderMessageTemplate, tasksForMessage } from "../shared/message-templates"
import { settingsSchema, startWorkdaySchema, taskSchema, updateTaskSchema } from "../shared/validations"

const ACTIVE_WORKDAY_KEY = "current-workday"
const ACTIVE_SESSION_KEY = "current-session"

type TelegramMessageType = "start" | "pause" | "resume" | "end"
type WorkdayStatus = "planned" | "working" | "paused" | "finished" | "cancelled"

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string }

function fail(error: unknown): never {
  throw new Error(error instanceof Error ? error.message : String(error))
}

async function ensureSettings(client: Prisma.TransactionClient | PrismaClient = getDb()) {
  const existing = await client.settings.findUnique({ where: { id: 1 } })
  if (existing) {
    const bootstrap = {
      ...(existing.telegramBotToken ? {} : process.env.TELEGRAM_BOT_TOKEN?.trim() ? { telegramBotToken: process.env.TELEGRAM_BOT_TOKEN.trim() } : {}),
      ...(existing.telegramChatId ? {} : process.env.TELEGRAM_CHAT_ID?.trim() ? { telegramChatId: process.env.TELEGRAM_CHAT_ID.trim() } : {}),
    }
    return Object.keys(bootstrap).length > 0 ? client.settings.update({ where: { id: 1 }, data: bootstrap }) : existing
  }
  try {
    return await client.settings.create({
      data: {
        id: 1,
        timezone: process.env.APP_TIMEZONE || "Europe/Berlin",
        defaultStartTime: "08:45",
        telegramChatId: process.env.TELEGRAM_CHAT_ID?.trim() || "",
        telegramBotToken: process.env.TELEGRAM_BOT_TOKEN?.trim() || "",
        minimizeOnClose: true,
        desktopNotifications: false,
        startMessageTemplate: DEFAULT_TEMPLATES.start,
        pauseMessageTemplate: DEFAULT_TEMPLATES.pause,
        resumeMessageTemplate: DEFAULT_TEMPLATES.resume,
        endMessageTemplate: DEFAULT_TEMPLATES.end,
      },
    })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const concurrent = await client.settings.findUnique({ where: { id: 1 } })
      if (concurrent) return concurrent
    }
    throw error
  }
}

export async function getSettings() {
  return ensureSettings()
}

export async function getCurrentWorkday() {
  return getDb().workday.findFirst({
    where: { activeKey: ACTIVE_WORKDAY_KEY },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
      },
      telegramMessages: { orderBy: { createdAt: "asc" } },
    },
  })
}

export async function getWorkdayById(id: string) {
  return getDb().workday.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
      },
      telegramMessages: { orderBy: { createdAt: "asc" } },
    },
  })
}

export async function getFinishedWorkdays() {
  return getDb().workday.findMany({
    where: { status: "finished" },
    orderBy: { endedAt: "desc" },
    include: {
      sessions: {
        orderBy: { startedAt: "asc" },
        include: { tasks: { orderBy: { createdAt: "asc" } } },
      },
      telegramMessages: { orderBy: { createdAt: "asc" } },
    },
  })
}

export async function createPlannedOrImmediateWorkday(input: { date: string; time: string }) {
  const parsed = startWorkdaySchema.parse(input)
  const scheduledStartAt = zonedLocalDateTime(parsed.date, parsed.time)
  const now = new Date()
  const startsImmediately = scheduledStartAt <= now

  return getDb().$transaction(async (tx) => {
    const active = await tx.workday.findUnique({ where: { activeKey: ACTIVE_WORKDAY_KEY } })
    if (active) fail("Es gibt bereits einen offenen Arbeitstag.")

    const settings = await ensureSettings(tx)
    const workday = await tx.workday.create({
      data: {
        status: startsImmediately ? "working" : "planned",
        scheduledStartAt,
        actualStartAt: startsImmediately ? now : null,
        activeKey: ACTIVE_WORKDAY_KEY,
        sessions: startsImmediately
          ? { create: { type: "work", startedAt: now, activeKey: ACTIVE_SESSION_KEY } }
          : undefined,
      },
    })

    const content = renderMessageTemplate(settings.startMessageTemplate, {
      date: formatDate(scheduledStartAt),
      startTime: formatTime(startsImmediately ? now : scheduledStartAt),
    })
    const message = await tx.telegramMessage.create({
      data: {
        workdayId: workday.id,
        type: "start",
        content,
        scheduledFor: now,
      },
    })

    return { workday, message, startsImmediately }
  })
}

export async function startScheduledWorkday(workdayId: string) {
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({ where: { id: workdayId } })
    const now = new Date()
    if (!workday || workday.status !== "planned" || !workday.scheduledStartAt || workday.scheduledStartAt > now) return null
    const startedAt = workday.scheduledStartAt
    const claimed = await tx.workday.updateMany({
      where: { id: workday.id, status: "planned", scheduledStartAt: { lte: now } },
      data: { status: "working", actualStartAt: startedAt },
    })
    if (claimed.count === 0) return null
    await tx.workSession.create({ data: { workdayId: workday.id, type: "work", startedAt, activeKey: ACTIVE_SESSION_KEY } })
    return tx.workday.findUnique({ where: { id: workday.id }, include: { sessions: true } })
  })
}

export async function cancelPlannedWorkday() {
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({ where: { activeKey: ACTIVE_WORKDAY_KEY } })
    if (!workday || workday.status !== "planned") fail("Nur geplante Arbeitstage können abgebrochen werden.")
    await tx.telegramMessage.updateMany({
      where: { workdayId: workday.id, type: "start", status: "pending" },
      data: { status: "cancelled" },
    })
    return tx.workday.update({ where: { id: workday.id }, data: { status: "cancelled", activeKey: null } })
  })
}

async function createMessage(
  tx: Prisma.TransactionClient,
  data: { workdayId: string; type: TelegramMessageType; content: string; scheduledFor?: Date },
) {
  return tx.telegramMessage.create({
    data: { ...data, scheduledFor: data.scheduledFor ?? new Date() },
  })
}

export async function pauseWorkday() {
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({ where: { activeKey: ACTIVE_WORKDAY_KEY } })
    if (!workday || workday.status !== "working") fail("Pause ist nur während laufender Arbeit möglich.")
    const session = await tx.workSession.findUnique({ where: { activeKey: ACTIVE_SESSION_KEY }, include: { tasks: true } })
    if (!session || session.workdayId !== workday.id || session.type !== "work") fail("Keine offene Arbeitssession gefunden.")

    const now = new Date()
    const settings = await ensureSettings(tx)
    await tx.workSession.update({ where: { id: session.id }, data: { endedAt: now, activeKey: null } })
    await tx.workday.update({ where: { id: workday.id }, data: { status: "paused" } })
    const breakSession = await tx.workSession.create({ data: { workdayId: workday.id, type: "break", startedAt: now, activeKey: ACTIVE_SESSION_KEY } })
    const content = renderMessageTemplate(settings.pauseMessageTemplate, {
      date: formatDate(now),
      startTime: formatTime(session.startedAt),
      endTime: formatTime(now),
      tasks: tasksForMessage(session.tasks),
    })
    const message = await createMessage(tx, { workdayId: workday.id, type: "pause", content })
    return { workdayId: workday.id, messageId: message.id, breakSessionId: breakSession.id }
  })
}

export async function resumeWorkday() {
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({ where: { activeKey: ACTIVE_WORKDAY_KEY } })
    if (!workday || workday.status !== "paused") fail("Fortsetzen ist nur während einer Pause möglich.")
    const session = await tx.workSession.findUnique({ where: { activeKey: ACTIVE_SESSION_KEY } })
    if (!session || session.workdayId !== workday.id || session.type !== "break") fail("Keine offene Pause gefunden.")

    const now = new Date()
    const settings = await ensureSettings(tx)
    await tx.workSession.update({ where: { id: session.id }, data: { endedAt: now, activeKey: null } })
    const nextSession = await tx.workSession.create({ data: { workdayId: workday.id, type: "work", startedAt: now, activeKey: ACTIVE_SESSION_KEY } })
    await tx.workday.update({ where: { id: workday.id }, data: { status: "working" } })
    const content = renderMessageTemplate(settings.resumeMessageTemplate, {
      date: formatDate(now),
      startTime: formatTime(now),
    })
    const message = await createMessage(tx, { workdayId: workday.id, type: "resume", content })
    return { workdayId: workday.id, messageId: message.id, sessionId: nextSession.id }
  })
}

export async function finishWorkday() {
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({ where: { activeKey: ACTIVE_WORKDAY_KEY } })
    if (!workday || workday.status !== "working") fail("Arbeit kann nur während laufender Arbeit beendet werden.")
    const session = await tx.workSession.findUnique({ where: { activeKey: ACTIVE_SESSION_KEY }, include: { tasks: true } })
    if (!session || session.workdayId !== workday.id || session.type !== "work") fail("Keine offene Arbeitssession gefunden.")

    const now = new Date()
    const settings = await ensureSettings(tx)
    await tx.workSession.update({ where: { id: session.id }, data: { endedAt: now, activeKey: null } })
    await tx.workday.update({ where: { id: workday.id }, data: { status: "finished", endedAt: now, activeKey: null } })
    const content = renderMessageTemplate(settings.endMessageTemplate, {
      date: formatDate(now),
      startTime: formatTime(session.startedAt),
      endTime: formatTime(now),
      tasks: tasksForMessage(session.tasks),
    })
    const message = await createMessage(tx, { workdayId: workday.id, type: "end", content })
    return { workdayId: workday.id, messageId: message.id }
  })
}

export async function createTask(input: { workSessionId: string; content: string }) {
  const parsed = taskSchema.parse(input)
  return getDb().$transaction(async (tx) => {
    const session = await tx.workSession.findUnique({ where: { id: parsed.workSessionId }, include: { workday: true } })
    if (!session || session.workday.status !== "working" || session.endedAt || session.activeKey !== ACTIVE_SESSION_KEY) {
      fail("Aufgaben können nur in der offenen Arbeitssession erfasst werden.")
    }
    return tx.task.create({ data: parsed })
  })
}

export async function updateTask(input: { taskId: string; content: string }) {
  const parsed = updateTaskSchema.parse(input)
  const task = await getDb().task.findUnique({ where: { id: parsed.taskId }, include: { workSession: { include: { workday: true } } } })
  if (!task || ["finished", "cancelled"].includes(task.workSession.workday.status)) fail("Diese Aufgabe kann nicht mehr bearbeitet werden.")
  return getDb().task.update({ where: { id: parsed.taskId }, data: { content: parsed.content } })
}

export async function deleteTask(taskId: string) {
  const task = await getDb().task.findUnique({ where: { id: taskId }, include: { workSession: { include: { workday: true } } } })
  if (!task || ["finished", "cancelled"].includes(task.workSession.workday.status)) fail("Diese Aufgabe kann nicht mehr gelöscht werden.")
  return getDb().task.delete({ where: { id: taskId } })
}

export async function getTasksForSession(workSessionId: string) {
  return getDb().task.findMany({ where: { workSessionId }, orderBy: { createdAt: "asc" } })
}

export async function updateSettings(input: unknown) {
  const parsed = settingsSchema.parse(input)
  const { telegramBotToken, ...settings } = parsed
  await ensureSettings()
  return getDb().settings.update({
    where: { id: 1 },
    data: { ...settings, ...(telegramBotToken ? { telegramBotToken } : {}) },
  })
}

export async function getMessage(id: string) {
  return getDb().telegramMessage.findUnique({ where: { id }, include: { workday: true } })
}

export async function getDueMessages() {
  const stale = new Date(Date.now() - 5 * 60 * 1000)
  return getDb().telegramMessage.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: new Date() },
      OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
    },
    orderBy: { scheduledFor: "asc" },
    take: 50,
  })
}

export async function getDuePlannedWorkdays() {
  return getDb().workday.findMany({
    where: {
      status: "planned",
      scheduledStartAt: { not: null, lte: new Date() },
    },
    orderBy: { scheduledStartAt: "asc" },
    select: { id: true },
    take: 50,
  })
}

export type WorkdayStatusValue = WorkdayStatus

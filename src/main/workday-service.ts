import type { Prisma } from "@prisma/client"

import { getDb } from "./db"
import { getSettings } from "./settings-service"
import {
  renderMessageTemplate,
  tasksForMessage,
} from "../shared/message-templates"
import {
  adjustTimeSchema,
  requestActionSchema,
  taskSchema,
  todayPauseSchema,
  updateTaskSchema,
  type ActionType,
  type PreviewInput,
} from "../shared/schemas"
import { formatDate, formatTime, startOfToday, todayAt } from "../shared/time"
import type { WorkdayData } from "../shared/types"

const ACTIVE_WORKDAY_KEY = "current-workday"
const ACTIVE_SESSION_KEY = "current-session"

const workdayInclude = {
  sessions: { orderBy: { startedAt: "asc" } },
  tasks: { orderBy: [{ part: "asc" }, { createdAt: "asc" }] },
  telegramMessages: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.WorkdayInclude

export type FullWorkday = Prisma.WorkdayGetPayload<{
  include: typeof workdayInclude
}>
type Tx = Prisma.TransactionClient

/** Ergebnis einer ausgeführten An-/Abmeldung. */
export type ExecutedAction = {
  type: ActionType
  workdayId: string
  messageId: string | null
}

const REQUIRED_STATUS: Record<ActionType, string[]> = {
  start: ["planned"],
  pause: ["working"],
  resume: ["paused"],
  end: ["working"],
}

const WRONG_STATUS: Record<ActionType, string> = {
  start: "Du bist heute bereits angemeldet.",
  pause: "Zur Pause abmelden geht nur, während du arbeitest.",
  resume: "Wieder anmelden geht nur während der Pause.",
  end: "Feierabend geht nur, während du arbeitest. Bist du noch in der Pause?",
}

function fail(message: string): never {
  throw new Error(message)
}

// ---------- Lesen ----------

export function getCurrentWorkday(client: Tx = getDb()) {
  return client.workday.findUnique({
    where: { activeKey: ACTIVE_WORKDAY_KEY },
    include: workdayInclude,
  })
}

export function getWorkdayById(id: string) {
  return getDb().workday.findUnique({ where: { id }, include: workdayInclude })
}

export function getFinishedWorkdays() {
  return getDb().workday.findMany({
    where: { status: "finished" },
    orderBy: { endedAt: "desc" },
    include: workdayInclude,
    take: 120,
  })
}

export function getFinishedToday(now = new Date()) {
  return getDb().workday.findFirst({
    where: { status: "finished", endedAt: { gte: startOfToday(now) } },
    orderBy: { endedAt: "desc" },
    include: workdayInclude,
  })
}

/** Wurde heute schon gearbeitet (angemeldet)? */
export async function hasStartedToday(now = new Date()) {
  const count = await getDb().workday.count({
    where: {
      status: { in: ["working", "paused", "finished"] },
      actualStartAt: { gte: startOfToday(now) },
    },
  })
  return count > 0
}

export function serializeWorkday(workday: FullWorkday): WorkdayData {
  const iso = (value: Date | null) => value?.toISOString() ?? null
  return {
    id: workday.id,
    status: workday.status as WorkdayData["status"],
    scheduledStartAt: iso(workday.scheduledStartAt),
    actualStartAt: iso(workday.actualStartAt),
    endedAt: iso(workday.endedAt),
    plannedPauseAt: iso(workday.plannedPauseAt),
    pauseMinutes: workday.pauseMinutes,
    pendingAction: workday.pendingAction as ActionType | null,
    pendingActionAt: iso(workday.pendingActionAt),
    sessions: workday.sessions.map((session) => ({
      id: session.id,
      type: session.type as "work" | "break",
      startedAt: session.startedAt.toISOString(),
      endedAt: iso(session.endedAt),
    })),
    tasks: workday.tasks.map(({ id, content, part }) => ({
      id,
      content,
      part,
    })),
    messages: workday.telegramMessages.map((message) => ({
      id: message.id,
      type: message.type as ActionType,
      status: message.status as WorkdayData["messages"][number]["status"],
      content: message.content,
      errorMessage: message.errorMessage,
      sentAt: iso(message.sentAt),
    })),
  }
}

// ---------- Nachrichten ----------

async function renderMessage(
  tx: Tx,
  type: ActionType,
  workday: FullWorkday | null,
  at: Date
) {
  const settings = await getSettings(tx)
  const templates: Record<ActionType, string> = {
    start: settings.startMessageTemplate,
    pause: settings.pauseMessageTemplate,
    resume: settings.resumeMessageTemplate,
    end: settings.endMessageTemplate,
  }
  const sessions = workday?.sessions ?? []
  const workSessions = sessions.filter((session) => session.type === "work")
  const lastWork = workSessions.at(-1)
  const current = Math.max(0, workSessions.length - 1)
  const allTasks = workday?.tasks ?? []
  // Pause: alle Aufgaben bis jetzt (ohne vorab notierte für später).
  // Feierabend: Aufgaben seit der Pause.
  const tasks =
    type === "pause"
      ? allTasks.filter((task) => task.part <= current)
      : allTasks.filter((task) => task.part >= current)
  const startedAt =
    type === "end" ? lastWork?.startedAt : workday?.actualStartAt
  return renderMessageTemplate(templates[type], {
    date: formatDate(at),
    startTime: formatTime(
      type === "start" || type === "resume" ? at : startedAt
    ),
    endTime: formatTime(at),
    tasks: tasksForMessage(tasks),
  })
}

export async function previewMessage(input: PreviewInput, now = new Date()) {
  const at = input.at ? todayAt(input.at, now) : now
  return renderMessage(getDb(), input.type, await getCurrentWorkday(), at)
}

// ---------- Zustandswechsel ----------

/**
 * Führt eine An-/Abmeldung zum Zeitpunkt `at` aus.
 * message: null = Vorlage, "" = keine Nachricht, sonst eigener Text.
 */
async function executeAction(
  tx: Tx,
  type: ActionType,
  at: Date,
  message: string | null
): Promise<ExecutedAction> {
  let workday = await getCurrentWorkday(tx)
  if (type === "start" && !workday) {
    workday = await tx.workday.create({
      data: { status: "planned", activeKey: ACTIVE_WORKDAY_KEY },
      include: workdayInclude,
    })
  }
  if (!workday) fail("Du bist heute noch nicht angemeldet.")
  if (!REQUIRED_STATUS[type].includes(workday.status)) fail(WRONG_STATUS[type])

  const openSession = workday.sessions.find((session) => !session.endedAt)
  if (openSession && at <= openSession.startedAt) {
    fail(`Wähle eine Uhrzeit nach ${formatTime(openSession.startedAt)}.`)
  }
  const content =
    message === null ? await renderMessage(tx, type, workday, at) : message

  if (openSession) {
    await tx.workSession.update({
      where: { id: openSession.id },
      data: { endedAt: at, activeKey: null },
    })
  }
  if (type !== "end") {
    await tx.workSession.create({
      data: {
        workdayId: workday.id,
        type: type === "pause" ? "break" : "work",
        startedAt: at,
        activeKey: ACTIVE_SESSION_KEY,
      },
    })
  }

  const clearPending = {
    pendingAction: null,
    pendingActionAt: null,
    pendingMessage: null,
  }
  const statusData: Record<ActionType, Prisma.WorkdayUpdateInput> = {
    start: { status: "working", actualStartAt: at, scheduledStartAt: at },
    pause: { status: "paused", plannedPauseAt: at },
    resume: { status: "working" },
    end: { status: "finished", endedAt: at, activeKey: null },
  }
  await tx.workday.update({
    where: { id: workday.id },
    data: { ...statusData[type], ...clearPending },
  })

  let messageId: string | null = null
  if (content.trim()) {
    const created = await tx.telegramMessage.create({
      data: { workdayId: workday.id, type, content, scheduledFor: new Date() },
    })
    messageId = created.id
  }
  return { type, workdayId: workday.id, messageId }
}

/**
 * Vom Dialog bestätigt: liegt die Ziel-Uhrzeit in der Zukunft, wird die Aktion
 * vorgemerkt und vom Worker pünktlich ausgeführt. Liegt sie schon zurück, wird
 * sie sofort ausgeführt – eingetragen wird trotzdem die gewählte Uhrzeit.
 */
export async function requestAction(input: unknown, now = new Date()) {
  const parsed = requestActionSchema.parse(input)
  const at = parsed.at ? todayAt(parsed.at, now) : now
  const runNow = at.getTime() <= now.getTime()

  return getDb().$transaction(async (tx) => {
    let workday = await getCurrentWorkday(tx)
    if (parsed.type === "pause" && parsed.at) {
      await rememberPauseTime(tx, parsed.at)
    }
    if (parsed.type === "pause" && parsed.pauseMinutes && workday) {
      await tx.workday.update({
        where: { id: workday.id },
        data: { pauseMinutes: parsed.pauseMinutes },
      })
    }
    if (runNow) {
      const executed = await executeAction(tx, parsed.type, at, parsed.message)
      return { executed, messageId: null }
    }

    if (parsed.type === "start" && !workday) {
      workday = await tx.workday.create({
        data: { status: "planned", activeKey: ACTIVE_WORKDAY_KEY },
        include: workdayInclude,
      })
    }
    if (!workday) fail("Du bist heute noch nicht angemeldet.")
    if (!REQUIRED_STATUS[parsed.type].includes(workday.status)) {
      fail(WRONG_STATUS[parsed.type])
    }
    // Nachricht sofort senden, die Zeit zählt trotzdem erst ab `at`.
    let messageId: string | null = null
    if (parsed.sendNow && parsed.message !== "") {
      const content =
        parsed.message ?? (await renderMessage(tx, parsed.type, workday, at))
      if (content.trim()) {
        const created = await tx.telegramMessage.create({
          data: {
            workdayId: workday.id,
            type: parsed.type,
            content,
            scheduledFor: now,
          },
        })
        messageId = created.id
      }
    }
    await tx.workday.update({
      where: { id: workday.id },
      data: {
        pendingAction: parsed.type,
        pendingActionAt: at,
        pendingMessage: parsed.sendNow ? "" : parsed.message,
        ...(parsed.type === "start" ? { scheduledStartAt: at } : {}),
        ...(parsed.type === "pause" ? { plannedPauseAt: at } : {}),
      },
    })
    return { executed: null, messageId }
  })
}

/** Vom Worker: fällige vorgemerkte Aktion zur geplanten Uhrzeit ausführen. */
export async function runDuePendingAction(now = new Date()) {
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({
      where: { activeKey: ACTIVE_WORKDAY_KEY },
    })
    if (!workday?.pendingAction || !workday.pendingActionAt) return null
    if (workday.pendingActionAt > now) return null
    return executeAction(
      tx,
      workday.pendingAction as ActionType,
      workday.pendingActionAt,
      workday.pendingMessage
    )
  })
}

/** Vorgemerkte Aktion nicht abwarten, sondern jetzt ausführen. */
export async function runPendingNow(now = new Date()) {
  return getDb().$transaction(async (tx) => {
    const workday = await getCurrentWorkday(tx)
    if (!workday?.pendingAction) fail("Es ist nichts vorgemerkt.")
    return executeAction(
      tx,
      workday.pendingAction as ActionType,
      now,
      workday.pendingMessage
    )
  })
}

export async function cancelPendingAction() {
  const workday = await getCurrentWorkday()
  if (!workday?.pendingAction) return
  if (workday.pendingAction === "start" && workday.status === "planned") {
    await getDb().workday.update({
      where: { id: workday.id },
      data: { status: "cancelled", activeKey: null, pendingAction: null },
    })
    return
  }
  await getDb().workday.update({
    where: { id: workday.id },
    data: { pendingAction: null, pendingActionAt: null, pendingMessage: null },
  })
}

export async function nextPendingActionAt() {
  const workday = await getDb().workday.findUnique({
    where: { activeKey: ACTIVE_WORKDAY_KEY },
    select: { pendingActionAt: true },
  })
  return workday?.pendingActionAt ?? null
}

/** Pausenzeit/-dauer nur für heute ändern. */
export async function setTodayPause(input: unknown, now = new Date()) {
  const parsed = todayPauseSchema.parse(input)
  const workday = await getCurrentWorkday()
  if (!workday || !["planned", "working"].includes(workday.status)) {
    fail("Die Pause kannst du anpassen, sobald du angemeldet bist.")
  }
  await getDb().workday.update({
    where: { id: workday.id },
    data: {
      plannedPauseAt: todayAt(parsed.at, now),
      pauseMinutes: parsed.minutes,
    },
  })
  await rememberPauseTime(getDb(), parsed.at)
}

/** Zuletzt gewählte Pausenzeit wird zum neuen Standard für die nächsten Tage. */
async function rememberPauseTime(client: Tx, time: string) {
  await getSettings(client)
  await client.settings.update({ where: { id: 1 }, data: { pauseTime: time } })
}

/**
 * Uhrzeit eines bereits erledigten Schritts korrigieren. Verschiebt dabei die
 * Grenze zwischen den angrenzenden Abschnitten, Telegram bleibt unberührt.
 */
export async function adjustTime(input: unknown, now = new Date()) {
  const { workdayId, step, at: time } = adjustTimeSchema.parse(input)
  return getDb().$transaction(async (tx) => {
    const workday = await tx.workday.findUnique({
      where: { id: workdayId },
      include: workdayInclude,
    })
    if (!workday?.actualStartAt) fail("Dieser Tag wurde nicht gefunden.")
    const at = todayAt(time, workday.actualStartAt)
    if (at > now) fail("Die Uhrzeit liegt in der Zukunft.")

    const sessions = workday.sessions
    const breakIndex = sessions.findIndex((session) => session.type === "break")
    const check = (lower: Date | null, upper: Date | null) => {
      if ((lower && at <= lower) || (upper && at >= upper)) {
        fail(
          `Wähle eine Uhrzeit${lower ? ` nach ${formatTime(lower)}` : ""}${
            lower && upper ? " und" : ""
          }${upper ? ` vor ${formatTime(upper)}` : ""}.`
        )
      }
    }
    const setSession = (id: string, data: Prisma.WorkSessionUpdateInput) =>
      tx.workSession.update({ where: { id }, data })
    const setWorkday = (data: Prisma.WorkdayUpdateInput) =>
      tx.workday.update({ where: { id: workday.id }, data })

    if (step === "start") {
      const first = sessions[0]
      if (!first) fail("Es gibt noch keinen Arbeitsabschnitt.")
      check(null, first.endedAt ?? now)
      await setSession(first.id, { startedAt: at })
      await setWorkday({ actualStartAt: at, scheduledStartAt: at })
    } else if (step === "pause" || step === "resume") {
      const pause = sessions[breakIndex]
      if (!pause) fail("Du warst heute noch nicht in der Pause.")
      if (step === "pause") {
        const before = sessions[breakIndex - 1]
        check(before?.startedAt ?? null, pause.endedAt ?? now)
        if (before) await setSession(before.id, { endedAt: at })
        await setSession(pause.id, { startedAt: at })
        await setWorkday({ plannedPauseAt: at })
      } else {
        const after = sessions[breakIndex + 1]
        if (!pause.endedAt || !after) fail("Du bist noch in der Pause.")
        check(pause.startedAt, after.endedAt ?? now)
        await setSession(pause.id, { endedAt: at })
        await setSession(after.id, { startedAt: at })
      }
    } else {
      const last = sessions.at(-1)
      if (workday.status !== "finished" || !last) {
        fail("Den Feierabend kannst du erst nach dem Abmelden ändern.")
      }
      check(last.startedAt, null)
      await setSession(last.id, { endedAt: at })
      await setWorkday({ endedAt: at })
    }
  })
}

// ---------- Aufgaben ----------

/** Aufgaben lassen sich jederzeit jedem Abschnitt des Tages zuordnen. */
export async function createTask(input: unknown) {
  const { workdayId, part, content } = taskSchema.parse(input)
  const workday = await getDb().workday.findUnique({ where: { id: workdayId } })
  if (!workday || workday.status === "cancelled") {
    fail("Melde dich zuerst an, dann kannst du Aufgaben erfassen.")
  }
  return getDb().task.create({ data: { workdayId, part, content } })
}

export async function updateTask(input: unknown) {
  const { taskId, content } = updateTaskSchema.parse(input)
  return getDb().task.update({ where: { id: taskId }, data: { content } })
}

export async function deleteTask(taskId: string) {
  return getDb().task.delete({ where: { id: taskId } })
}

// ---------- Telegram ----------

export function getDueMessages() {
  const stale = new Date(Date.now() - 5 * 60 * 1000)
  return getDb().telegramMessage.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: new Date() },
      OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
    },
    orderBy: { scheduledFor: "asc" },
    take: 20,
  })
}

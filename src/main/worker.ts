import { afterAction, sendTelegram } from "./action-runner"
import { currentReminder } from "./reminders"
import {
  emitChanged,
  flash,
  notify,
  releaseAttention,
  showWindow,
} from "./window"
import {
  getDueMessages,
  nextPendingActionAt,
  runDuePendingAction,
} from "./workday-service"
import type { ReminderData } from "../shared/types"

const TICK_MS = 10_000
const RENOTIFY_MS = 60_000

const REMINDER_TEXT = {
  start: ["Zeit zum Anmelden", "Melde dich in Telegram an."],
  pause: ["Gleich Pause", "Denk daran, dich zur Pause abzumelden."],
  resume: ["Pause ist vorbei", "Melde dich wieder an."],
  end: ["Gleich Feierabend", "Denk daran, dich abzumelden."],
} as const

let interval: NodeJS.Timeout | null = null
let exactTimer: NodeJS.Timeout | null = null
let running = false
let rerun = false
let shownKey: string | null = null
let lastNotifiedAt = 0

function reminderKey(reminder: ReminderData | null) {
  return reminder ? `${reminder.type}:${reminder.dueAt}` : null
}

function handleReminder(reminder: ReminderData | null) {
  const key = reminderKey(reminder)
  if (!reminder) {
    if (shownKey) {
      shownKey = null
      releaseAttention()
      emitChanged()
    }
    return
  }
  const [title, body] = REMINDER_TEXT[reminder.type]
  if (key !== shownKey) {
    shownKey = key
    lastNotifiedAt = Date.now()
    showWindow({ attention: true })
    notify(title, body)
    emitChanged()
  } else if (Date.now() - lastNotifiedAt >= RENOTIFY_MS) {
    // Nicht reagiert → jede Minute erneut melden.
    lastNotifiedAt = Date.now()
    showWindow({ attention: true })
    flash()
    notify(title, body)
  }
}

/** Exakter Timer auf die nächste vorgemerkte Aktion, damit pünktlich gesendet wird. */
async function scheduleExact() {
  if (exactTimer) clearTimeout(exactTimer)
  exactTimer = null
  const at = await nextPendingActionAt()
  if (!at) return
  const delay = at.getTime() - Date.now()
  if (delay > 0 && delay < TICK_MS * 2) {
    exactTimer = setTimeout(() => void tick(), delay + 50)
  }
}

export async function tick() {
  if (running) {
    rerun = true
    return
  }
  running = true
  try {
    const executed = await runDuePendingAction()
    if (executed) await afterAction(executed)

    for (const message of await getDueMessages()) await sendTelegram(message.id)

    handleReminder(await currentReminder())
    await scheduleExact()
  } catch (error) {
    console.error("ADHDWorker-Worker fehlgeschlagen:", error)
  } finally {
    running = false
    if (rerun) {
      rerun = false
      void tick()
    }
  }
}

export function startWorker() {
  void tick()
  interval = setInterval(() => void tick(), TICK_MS)
}

export function stopWorker() {
  if (interval) clearInterval(interval)
  if (exactTimer) clearTimeout(exactTimer)
  interval = null
  exactTimer = null
}

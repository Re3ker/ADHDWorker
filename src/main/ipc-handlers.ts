import { ipcMain, shell } from "electron"
import { z } from "zod"

import { afterAction, sendTelegram } from "./action-runner"
import {
  currentReminder,
  skippedToday,
  skipReminderToday,
  snoozeReminder,
  unskipReminder,
} from "./reminders"
import {
  getSettings,
  serializeSettings,
  updateSettings,
} from "./settings-service"
import { resetTelegramMessage } from "./telegram"
import { getAvailableUpdate, installUpdate } from "./update-service"
import {
  applyLaunchAtLogin,
  emitChanged,
  setMinimizeOnClose,
  windowControls,
} from "./window"
import { tick } from "./worker"
import {
  cancelPendingAction,
  createTask,
  deleteTask,
  getCurrentWorkday,
  getFinishedToday,
  getFinishedWorkdays,
  previewMessage,
  requestAction,
  runPendingNow,
  serializeWorkday,
  setTodayPause,
  adjustTime,
  updateTask,
} from "./workday-service"
import { actionTypeSchema, idSchema, previewSchema } from "../shared/schemas"
import type { ActionResponse, DashboardData } from "../shared/types"

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Bitte Eingabe prüfen."
  }
  return error instanceof Error
    ? error.message
    : "Das hat nicht geklappt. Bitte erneut versuchen."
}

/** Schreibende Aktion: validieren, ausführen, UI aktualisieren, nie werfen. */
function action(channel: string, run: (input: unknown) => Promise<unknown>) {
  ipcMain.handle(channel, async (_event, input): Promise<ActionResponse> => {
    try {
      await run(input)
      emitChanged()
      void tick()
      return { ok: true }
    } catch (error) {
      return { ok: false, error: errorMessage(error) }
    }
  })
}

async function dashboardData(): Promise<DashboardData> {
  const [workday, finishedToday, settings, reminder] = await Promise.all([
    getCurrentWorkday(),
    getFinishedToday(),
    getSettings(),
    currentReminder(),
  ])
  return {
    workday: workday ? serializeWorkday(workday) : null,
    finishedToday: finishedToday ? serializeWorkday(finishedToday) : null,
    settings: {
      startTime: settings.startTime,
      pauseTime: settings.pauseTime,
      pauseMinutes: settings.pauseMinutes,
      targetWorkMinutes: settings.targetWorkMinutes,
      leadMinutes: settings.leadMinutes,
      telegramReady: Boolean(
        settings.telegramBotToken && settings.telegramChatId
      ),
      sendImmediately: {
        start: settings.sendStartImmediately,
        pause: settings.sendPauseImmediately,
        resume: settings.sendResumeImmediately,
        end: settings.sendEndImmediately,
      },
    },
    reminder,
    skippedReminders: skippedToday(),
  }
}

export function registerIpc() {
  ipcMain.handle("app:get-dashboard", () => dashboardData())
  ipcMain.handle("app:get-history", async () =>
    (await getFinishedWorkdays()).map(serializeWorkday)
  )
  ipcMain.handle("app:get-settings", async () =>
    serializeSettings(await getSettings())
  )
  ipcMain.handle("app:get-update", () => getAvailableUpdate())
  ipcMain.handle("app:install-update", () => installUpdate())
  ipcMain.handle("app:open-release-page", () => {
    const update = getAvailableUpdate()
    if (update) void shell.openExternal(update.releaseUrl)
  })
  ipcMain.handle("action:preview", async (_event, input) => {
    try {
      return {
        ok: true,
        text: await previewMessage(previewSchema.parse(input)),
      }
    } catch (error) {
      return { ok: false, error: errorMessage(error), text: "" }
    }
  })

  action("action:request", async (input) => {
    const { executed, messageId } = await requestAction(input)
    if (messageId) await sendTelegram(messageId)
    if (executed) await afterAction(executed)
  })
  action("action:run-pending-now", async () =>
    afterAction(await runPendingNow())
  )
  action("action:cancel-pending", () => cancelPendingAction())
  action("reminder:snooze", async (type) =>
    snoozeReminder(actionTypeSchema.parse(type))
  )
  action("reminder:skip", async (type) =>
    skipReminderToday(actionTypeSchema.parse(type))
  )
  action("reminder:unskip", async (type) =>
    unskipReminder(actionTypeSchema.parse(type))
  )
  action("day:set-pause", (input) => setTodayPause(input))
  action("day:adjust-time", (input) => adjustTime(input))

  action("task:create", (input) => createTask(input))
  action("task:update", (input) => updateTask(input))
  action("task:delete", (taskId) => deleteTask(idSchema.parse(taskId)))

  action("settings:update", async (input) => {
    const settings = await updateSettings(input)
    setMinimizeOnClose(settings.minimizeOnClose)
    applyLaunchAtLogin(settings.launchAtLogin)
  })
  action("telegram:retry", async (messageId) => {
    const id = idSchema.parse(messageId)
    await resetTelegramMessage(id)
    const message = await sendTelegram(id)
    if (message?.status === "failed")
      throw new Error(message.errorMessage ?? "Senden fehlgeschlagen.")
  })

  const controls = windowControls()
  ipcMain.handle("window:get-state", () => ({
    isMaximized: controls.isMaximized(),
  }))
  ipcMain.handle("window:minimize", () => controls.minimize())
  ipcMain.handle("window:toggle-maximize", () => controls.toggleMaximize())
  ipcMain.handle("window:close", () => controls.close())
}

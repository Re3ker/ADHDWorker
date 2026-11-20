import { contextBridge, ipcRenderer } from "electron"

import {
  actionTypeSchema,
  adjustTimeSchema,
  idSchema,
  previewSchema,
  requestActionSchema,
  settingsSchema,
  taskSchema,
  todayPauseSchema,
  updateTaskSchema,
} from "../shared/schemas"
import type {
  ActionResponse,
  DashboardData,
  SettingsData,
  UpdateInfo,
  WorkdayData,
} from "../shared/types"

function invoke<T>(channel: string, ...args: unknown[]) {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

/** Eingaben schon hier prüfen, damit Fehler direkt im Formular landen. */
function act(channel: string, value?: unknown): Promise<ActionResponse> {
  return invoke<ActionResponse>(channel, value)
}

function safely<T>(parse: () => T, channel: string): Promise<ActionResponse> {
  try {
    return act(channel, parse())
  } catch (error) {
    const message =
      error && typeof error === "object" && "issues" in error
        ? ((error as { issues: Array<{ message: string }> }).issues[0]
            ?.message ?? "Bitte Eingabe prüfen.")
        : "Bitte Eingabe prüfen."
    return Promise.resolve({ ok: false, error: message })
  }
}

function subscribe<T>(channel: string, callback: (payload: T) => void) {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) =>
    callback(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api = {
  getDashboard: () => invoke<DashboardData>("app:get-dashboard"),
  getHistory: () => invoke<WorkdayData[]>("app:get-history"),
  getSettings: () => invoke<SettingsData>("app:get-settings"),
  getUpdate: () => invoke<UpdateInfo | null>("app:get-update"),
  installUpdate: () => void invoke("app:install-update"),
  openReleasePage: () => void invoke("app:open-release-page"),

  previewMessage: (input: unknown) =>
    invoke<{ ok: boolean; text: string; error?: string }>(
      "action:preview",
      previewSchema.parse(input)
    ),
  requestAction: (input: unknown) =>
    safely(() => requestActionSchema.parse(input), "action:request"),
  runPendingNow: () => act("action:run-pending-now"),
  cancelPending: () => act("action:cancel-pending"),
  snoozeReminder: (type: unknown) =>
    safely(() => actionTypeSchema.parse(type), "reminder:snooze"),
  skipReminder: (type: unknown) =>
    safely(() => actionTypeSchema.parse(type), "reminder:skip"),
  unskipReminder: (type: unknown) =>
    safely(() => actionTypeSchema.parse(type), "reminder:unskip"),
  adjustTime: (input: unknown) =>
    safely(() => adjustTimeSchema.parse(input), "day:adjust-time"),
  setTodayPause: (input: unknown) =>
    safely(() => todayPauseSchema.parse(input), "day:set-pause"),

  createTask: (input: unknown) =>
    safely(() => taskSchema.parse(input), "task:create"),
  updateTask: (input: unknown) =>
    safely(() => updateTaskSchema.parse(input), "task:update"),
  deleteTask: (taskId: unknown) =>
    safely(() => idSchema.parse(taskId), "task:delete"),

  updateSettings: (input: unknown) =>
    safely(() => settingsSchema.parse(input), "settings:update"),
  retryTelegram: (messageId: unknown) =>
    safely(() => idSchema.parse(messageId), "telegram:retry"),

  onChanged: (callback: () => void) => subscribe("app:changed", callback),
  onDayFinished: (callback: (workdayId: string) => void) =>
    subscribe("app:day-finished", callback),
  onUpdateAvailable: (callback: (update: UpdateInfo) => void) =>
    subscribe("app:update-available", callback),

  getWindowState: () => invoke<{ isMaximized: boolean }>("window:get-state"),
  minimizeWindow: () => void invoke("window:minimize"),
  toggleMaximizeWindow: () => void invoke("window:toggle-maximize"),
  closeWindow: () => void invoke("window:close"),
  onWindowState: (callback: (state: { isMaximized: boolean }) => void) =>
    subscribe("app:window-state", callback),
}

export type AdhdWorkerApi = typeof api

contextBridge.exposeInMainWorld("adhdworker", api)

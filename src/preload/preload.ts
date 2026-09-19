import { contextBridge, ipcRenderer } from "electron"

import { clockifySyncIdInput, messageIdInput, startWorkdayInput, taskIdInput, taskInput, updateTaskInput, workspaceIdInput } from "../shared/ipc"
import { settingsSchema } from "../shared/validations"
import type { DashboardData, HistoryDay, SettingsData, ActionResponse, ClockifyOption } from "../shared/types"

type UpdateInfo = { version: string; releaseUrl: string }

function invoke<T>(channel: string, ...args: unknown[]) {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

const api = {
  getDashboard: () => invoke<DashboardData>("app:get-dashboard"),
  getHistory: () => invoke<HistoryDay[]>("app:get-history"),
  getSettings: () => invoke<SettingsData>("app:get-settings"),
  getUpdate: () => invoke<UpdateInfo | null>("app:get-update"),
  openReleasePage: () => void invoke<void>("app:open-release-page"),
  planWorkday: (input: unknown) => invoke<ActionResponse>("workday:plan", startWorkdayInput.parse(input)),
  cancelWorkday: () => invoke<ActionResponse>("workday:cancel"),
  pauseWorkday: () => invoke<ActionResponse>("workday:pause"),
  resumeWorkday: () => invoke<ActionResponse>("workday:resume"),
  finishWorkday: () => invoke<ActionResponse>("workday:finish"),
  createTask: (input: unknown) => invoke<ActionResponse>("task:create", taskInput.parse(input)),
  updateTask: (input: unknown) => invoke<ActionResponse>("task:update", updateTaskInput.parse(input)),
  deleteTask: (taskId: unknown) => invoke<ActionResponse>("task:delete", taskIdInput.parse(taskId)),
  updateSettings: (input: unknown) => invoke<ActionResponse>("settings:update", settingsSchema.parse(input)),
  retryTelegram: (messageId: unknown) => invoke<ActionResponse>("telegram:retry", messageIdInput.parse({ messageId })),
  getClockifyWorkspaces: () => invoke<{ ok: boolean; error?: string; items: ClockifyOption[] }>("clockify:workspaces"),
  getClockifyProjects: (input: unknown) => invoke<{ ok: boolean; error?: string; items: ClockifyOption[] }>("clockify:projects", workspaceIdInput.parse(input)),
  retryClockify: (syncEntryId: unknown) => invoke<ActionResponse>("clockify:retry", clockifySyncIdInput.parse({ syncEntryId })),
  setMinimizeOnClose: (value: unknown) => {
    if (typeof value === "boolean") void invoke<void>("desktop:set-minimize-on-close", value)
  },
  notify: (payload: unknown) => {
    if (!payload || typeof payload !== "object") return
    const value = payload as { title?: unknown; body?: unknown }
    if (typeof value.title === "string" && typeof value.body === "string") {
      void invoke<void>("desktop:notify", { title: value.title.slice(0, 120), body: value.body.slice(0, 500) })
    }
  },
  onChanged: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on("app:changed", listener)
    return () => ipcRenderer.removeListener("app:changed", listener)
  },
  onUpdateAvailable: (callback: (update: UpdateInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, update: UpdateInfo) => callback(update)
    ipcRenderer.on("app:update-available", listener)
    return () => ipcRenderer.removeListener("app:update-available", listener)
  },
  getWindowState: () => invoke<{ isMaximized: boolean }>("desktop:get-window-state"),
  minimizeWindow: () => void invoke<void>("desktop:minimize"),
  toggleMaximizeWindow: () => void invoke<void>("desktop:toggle-maximize"),
  closeWindow: () => void invoke<void>("desktop:close"),
  onWindowState: (callback: (state: { isMaximized: boolean }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: { isMaximized: boolean }) => callback(state)
    ipcRenderer.on("app:window-state", listener)
    return () => ipcRenderer.removeListener("app:window-state", listener)
  },
}

contextBridge.exposeInMainWorld("adhdworker", api)

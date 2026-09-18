import { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell } from "electron"
import { config as loadEnv } from "dotenv"
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

import { localDateInputValue, localTimeInputValue } from "../shared/time"
import { messageIdInput, startWorkdayInput, taskIdInput, taskInput, updateTaskInput } from "../shared/ipc"
import type { DashboardData, HistoryDay, SettingsData, WorkdayData, ActionResponse } from "../shared/types"
import { configureDatabase, disconnectDatabase } from "./db"
import {
  cancelPlannedWorkday,
  createPlannedOrImmediateWorkday,
  createTask,
  deleteTask,
  finishWorkday,
  getCurrentWorkday,
  getFinishedWorkdays,
  getSettings,
  pauseWorkday,
  resumeWorkday,
  updateSettings,
  updateTask,
} from "./workday-service"
import { deliverTelegramMessage, retryTelegramMessage } from "./telegram"
import { startWorker, stopWorker } from "./worker"
import { runMigrations } from "./migrations"
import { checkForUpdate, type UpdateInfo } from "./update-service"

loadEnv({ path: join(process.cwd(), ".env") })

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let minimizeOnClose = true
let availableUpdate: UpdateInfo | null = null

type FullWorkday = NonNullable<Awaited<ReturnType<typeof getCurrentWorkday>>>
type StoredSettings = Awaited<ReturnType<typeof getSettings>>

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Aktion konnte nicht ausgeführt werden."
}

function success(messageId?: string): ActionResponse {
  return messageId ? { ok: true, messageId } : { ok: true }
}

function failure(error: unknown): ActionResponse {
  return { ok: false, error: errorMessage(error) }
}

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null
}

function serializeWorkday(workday: FullWorkday | null): WorkdayData | null {
  if (!workday) return null
  return {
    id: workday.id,
    status: workday.status as WorkdayData["status"],
    scheduledStartAt: iso(workday.scheduledStartAt),
    actualStartAt: iso(workday.actualStartAt),
    endedAt: iso(workday.endedAt),
    sessions: workday.sessions.map((session) => ({
      id: session.id,
      type: session.type as "work" | "break",
      startedAt: session.startedAt.toISOString(),
      endedAt: iso(session.endedAt),
      tasks: session.tasks.map((task) => ({ id: task.id, content: task.content })),
    })),
    messages: workday.telegramMessages.map((message) => ({
      id: message.id,
      type: message.type as "start" | "pause" | "resume" | "end",
      status: message.status as "pending" | "sent" | "failed" | "cancelled",
      content: message.content,
      errorMessage: message.errorMessage,
    })),
  }
}

function serializeSettings(settings: StoredSettings): SettingsData {
  return {
    defaultStartTime: settings.defaultStartTime,
    telegramChatId: settings.telegramChatId,
    hasTelegramBotToken: Boolean(settings.telegramBotToken),
    timezone: settings.timezone,
    minimizeOnClose: settings.minimizeOnClose,
    desktopNotifications: settings.desktopNotifications,
    startMessageTemplate: settings.startMessageTemplate,
    pauseMessageTemplate: settings.pauseMessageTemplate,
    resumeMessageTemplate: settings.resumeMessageTemplate,
    endMessageTemplate: settings.endMessageTemplate,
  }
}

function serializeHistory(workday: FullWorkday): HistoryDay {
  const data = serializeWorkday(workday)
  if (!data) throw new Error("Arbeitstag konnte nicht geladen werden.")
  return {
    id: data.id,
    endedAt: data.endedAt,
    actualStartAt: data.actualStartAt,
    sessions: data.sessions,
    messages: data.messages.map(({ id, type, status, errorMessage }) => ({ id, type, status, errorMessage })),
  }
}

async function dashboardData(): Promise<DashboardData> {
  const [workday, settings] = await Promise.all([getCurrentWorkday(), getSettings()])
  return {
    workday: serializeWorkday(workday),
    settings: {
      defaultStartTime: settings.defaultStartTime,
      timezone: settings.timezone,
      desktopNotifications: settings.desktopNotifications,
    },
    defaultDate: localDateInputValue(),
    defaultTime: localTimeInputValue(),
  }
}

function notify(title: string, body: string) {
  if (Notification.isSupported()) new Notification({ title, body }).show()
}

async function notifyIfEnabled(title: string, body: string) {
  const settings = await getSettings()
  if (settings.desktopNotifications) notify(title, body)
}

function emitChanged() {
  mainWindow?.webContents.send("app:changed")
}

function emitWindowState() {
  mainWindow?.webContents.send("app:window-state", { isMaximized: mainWindow?.isMaximized() ?? false })
}

function databasePath() {
  const path = join(app.getPath("userData"), "adhdworker.sqlite")
  mkdirSync(app.getPath("userData"), { recursive: true })
  return path
}

function appIconPath() {
  return app.isPackaged ? join(process.resourcesPath, "app-icon.png") : join(app.getAppPath(), "public", "app-icon.png")
}

function showWindow() {
  mainWindow?.show()
  mainWindow?.focus()
}

function createTray() {
  const iconPath = appIconPath()
  const icon = existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip("ADHDWorker")
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "ADHDWorker öffnen", click: showWindow },
    { type: "separator" },
    { label: "Beenden", click: () => { isQuitting = true; app.quit() } },
  ]))
  tray.on("double-click", showWindow)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 620,
    show: false,
    frame: false,
    backgroundColor: "#111725",
    icon: appIconPath(),
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isDev ? !url.startsWith(process.env.ELECTRON_RENDERER_URL || "") : !url.startsWith("file:")) event.preventDefault()
  })
  mainWindow.on("close", (event) => {
    if (!isQuitting && minimizeOnClose) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on("closed", () => {
    mainWindow = null
    if (!isQuitting && !minimizeOnClose) app.quit()
  })
  mainWindow.on("maximize", emitWindowState)
  mainWindow.on("unmaximize", emitWindowState)
  if (isDev) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL as string)
  else void mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  mainWindow.once("ready-to-show", () => { showWindow(); emitWindowState() })
}

function registerIpc() {
  ipcMain.handle("app:get-dashboard", () => dashboardData())
  ipcMain.handle("app:get-history", async () => (await getFinishedWorkdays()).map(serializeHistory))
  ipcMain.handle("app:get-settings", async () => serializeSettings(await getSettings()))
  ipcMain.handle("app:get-update", () => availableUpdate)
  ipcMain.handle("app:open-release-page", () => {
    if (availableUpdate) void shell.openExternal(availableUpdate.releaseUrl)
  })

  ipcMain.handle("workday:plan", async (_event, input) => {
    try {
      const parsed = startWorkdayInput.parse(input)
      const result = await createPlannedOrImmediateWorkday(parsed)
      await deliverTelegramMessage(result.message.id)
      await notifyIfEnabled("Arbeitstag geplant", "Der Arbeitsstart wurde gespeichert.")
      emitChanged()
      return success(result.message.id)
    } catch (error) { return failure(error) }
  })
  ipcMain.handle("workday:cancel", async () => {
    try { await cancelPlannedWorkday(); emitChanged(); return success() } catch (error) { return failure(error) }
  })
  ipcMain.handle("workday:pause", async () => {
    try { const result = await pauseWorkday(); await deliverTelegramMessage(result.messageId); await notifyIfEnabled("Pause gestartet", "Die Arbeitszeit ist pausiert."); emitChanged(); return success(result.messageId) } catch (error) { return failure(error) }
  })
  ipcMain.handle("workday:resume", async () => {
    try { const result = await resumeWorkday(); await deliverTelegramMessage(result.messageId); await notifyIfEnabled("Arbeit fortgesetzt", "Die Arbeitszeit läuft weiter."); emitChanged(); return success(result.messageId) } catch (error) { return failure(error) }
  })
  ipcMain.handle("workday:finish", async () => {
    try { const result = await finishWorkday(); await deliverTelegramMessage(result.messageId); await notifyIfEnabled("Arbeitstag beendet", "Deine Zeiten und Aufgaben sind gespeichert."); emitChanged(); return success(result.messageId) } catch (error) { return failure(error) }
  })
  ipcMain.handle("task:create", async (_event, input) => {
    try { await createTask(taskInput.parse(input)); emitChanged(); return success() } catch (error) { return failure(error) }
  })
  ipcMain.handle("task:update", async (_event, input) => {
    try { await updateTask(updateTaskInput.parse(input)); emitChanged(); return success() } catch (error) { return failure(error) }
  })
  ipcMain.handle("task:delete", async (_event, taskId) => {
    try { await deleteTask(taskIdInput.parse(taskId)); emitChanged(); return success() } catch (error) { return failure(error) }
  })
  ipcMain.handle("settings:update", async (_event, input) => {
    try {
      const settings = await updateSettings(input)
      minimizeOnClose = settings.minimizeOnClose
      emitChanged()
      return success()
    } catch (error) { return failure(error) }
  })
  ipcMain.handle("telegram:retry", async (_event, input) => {
    try { const parsed = messageIdInput.parse(input); await retryTelegramMessage(parsed.messageId); emitChanged(); return success(parsed.messageId) } catch (error) { return failure(error) }
  })
  ipcMain.handle("desktop:set-minimize-on-close", (_event, value) => {
    if (typeof value === "boolean") minimizeOnClose = value
  })
  ipcMain.handle("desktop:notify", (_event, payload) => {
    if (payload && typeof payload.title === "string" && typeof payload.body === "string") notify(payload.title, payload.body)
  })
  ipcMain.handle("desktop:get-window-state", () => ({ isMaximized: mainWindow?.isMaximized() ?? false }))
  ipcMain.handle("desktop:minimize", () => mainWindow?.minimize())
  ipcMain.handle("desktop:toggle-maximize", () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle("desktop:close", () => mainWindow?.close())
}

app.setName("ADHDWorker")
if (process.platform === "win32") app.setAppUserModelId("com.adhdworker.app")
if (process.env.ADHDWORKER_DATA_DIR) {
  mkdirSync(process.env.ADHDWORKER_DATA_DIR, { recursive: true })
  app.setPath("userData", process.env.ADHDWORKER_DATA_DIR)
}

app.whenReady().then(async () => {
  const path = databasePath()
  await runMigrations(path)
  configureDatabase(path)
  const settings = await getSettings()
  minimizeOnClose = settings.minimizeOnClose
  registerIpc()
  startWorker(emitChanged)
  createTray()
  createWindow()
  void checkForUpdate().then((update) => {
    availableUpdate = update
    if (update) mainWindow?.webContents.send("app:update-available", update)
  })
  app.on("activate", showWindow)
}).catch((error) => {
  console.error("Electron-Start fehlgeschlagen:", error)
  app.quit()
})

app.on("before-quit", () => {
  isQuitting = true
  stopWorker()
  tray?.destroy()
  void disconnectDatabase()
})

import {
  app,
  BrowserWindow,
  Menu,
  Notification,
  Tray,
  nativeImage,
} from "electron"
import { existsSync } from "node:fs"
import { join } from "node:path"

const isDev = Boolean(process.env.ELECTRON_RENDERER_URL)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let minimizeOnClose = true

export function setMinimizeOnClose(value: boolean) {
  minimizeOnClose = value
}

export function markQuitting() {
  isQuitting = true
  tray?.destroy()
  tray = null
}

function resourcePath(name: string) {
  return app.isPackaged
    ? join(process.resourcesPath, name)
    : join(app.getAppPath(), "public", name)
}

export function sendToRenderer(channel: string, payload?: unknown) {
  mainWindow?.webContents.send(channel, payload)
}

export function emitChanged() {
  sendToRenderer("app:changed")
}

function emitWindowState() {
  sendToRenderer("app:window-state", {
    isMaximized: mainWindow?.isMaximized() ?? false,
  })
}

/** Fenster zeigen. Mit `attention` bleibt es im Vordergrund und blinkt. */
export function showWindow(options: { attention?: boolean } = {}) {
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  if (options.attention) {
    mainWindow.setAlwaysOnTop(true, "screen-saver")
    mainWindow.flashFrame(true)
  }
}

export function releaseAttention() {
  mainWindow?.setAlwaysOnTop(false)
  mainWindow?.flashFrame(false)
}

export function flash() {
  mainWindow?.flashFrame(true)
}

export function notify(title: string, body: string) {
  if (!Notification.isSupported()) return
  const notification = new Notification({
    title,
    body,
    icon: resourcePath("app-icon.png"),
  })
  notification.on("click", () => showWindow())
  notification.show()
}

export function windowControls() {
  return {
    isMaximized: () => mainWindow?.isMaximized() ?? false,
    minimize: () => mainWindow?.minimize(),
    toggleMaximize: () => {
      if (!mainWindow) return
      if (mainWindow.isMaximized()) mainWindow.unmaximize()
      else mainWindow.maximize()
    },
    close: () => mainWindow?.close(),
  }
}

export function createTray() {
  const iconPath = resourcePath("tray-icon.png")
  const icon = existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty()
  tray = new Tray(icon)
  tray.setToolTip("ADHDWorker")
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "ADHDWorker öffnen", click: () => showWindow() },
      { type: "separator" },
      {
        label: "Beenden",
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])
  )
  tray.on("double-click", () => showWindow())
}

export function createWindow({ hidden }: { hidden: boolean }) {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 620,
    show: false,
    frame: false,
    backgroundColor: "#111725",
    icon: resourcePath("app-icon.png"),
    webPreferences: {
      preload: join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev
      ? url.startsWith(process.env.ELECTRON_RENDERER_URL || "")
      : url.startsWith("file:")
    if (!allowed) event.preventDefault()
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
  mainWindow.on("focus", () => mainWindow?.flashFrame(false))
  mainWindow.on("maximize", emitWindowState)
  mainWindow.on("unmaximize", emitWindowState)

  if (isDev)
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL as string)
  else void mainWindow.loadFile(join(__dirname, "../renderer/index.html"))

  mainWindow.once("ready-to-show", () => {
    if (!hidden) showWindow()
    emitWindowState()
  })
}

/** Autostart mit Windows; startet dann nur im Infobereich. */
export function applyLaunchAtLogin(enabled: boolean) {
  if (!app.isPackaged) return
  app.setLoginItemSettings({ openAtLogin: enabled, args: ["--hidden"] })
}

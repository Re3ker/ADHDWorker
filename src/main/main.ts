import { app } from "electron"
import { config as loadEnv } from "dotenv"
import { mkdirSync } from "node:fs"
import { join } from "node:path"

import { configureDatabase, disconnectDatabase } from "./db"
import { registerIpc } from "./ipc-handlers"
import { runMigrations } from "./migrations"
import { getSettings } from "./settings-service"
import { checkForUpdate } from "./update-service"
import {
  applyLaunchAtLogin,
  createTray,
  createWindow,
  markQuitting,
  sendToRenderer,
  setMinimizeOnClose,
  showWindow,
} from "./window"
import { startWorker, stopWorker } from "./worker"

loadEnv({ path: join(process.cwd(), ".env") })

app.setName("ADHDWorker")
if (process.platform === "win32") app.setAppUserModelId("com.adhdworker.app")
if (process.env.ADHDWORKER_DATA_DIR) {
  mkdirSync(process.env.ADHDWORKER_DATA_DIR, { recursive: true })
  app.setPath("userData", process.env.ADHDWORKER_DATA_DIR)
}

// Nur eine Instanz: ein zweiter Start holt das vorhandene Fenster nach vorn.
const hasLock = app.requestSingleInstanceLock()
if (!hasLock) app.quit()
app.on("second-instance", () => showWindow())

app
  .whenReady()
  .then(async () => {
    if (!hasLock) return
    mkdirSync(app.getPath("userData"), { recursive: true })
    const databasePath = join(app.getPath("userData"), "adhdworker.sqlite")
    const migrations = app.isPackaged
      ? join(process.resourcesPath, "migrations")
      : join(app.getAppPath(), "prisma", "migrations")
    await runMigrations(databasePath, migrations)
    configureDatabase(databasePath)

    const settings = await getSettings()
    setMinimizeOnClose(settings.minimizeOnClose)
    applyLaunchAtLogin(settings.launchAtLogin)

    registerIpc()
    createTray()
    createWindow({ hidden: process.argv.includes("--hidden") })
    startWorker()

    void checkForUpdate().then((update) => {
      if (update) sendToRenderer("app:update-available", update)
    })
    app.on("activate", () => showWindow())
  })
  .catch((error) => {
    console.error("Electron-Start fehlgeschlagen:", error)
    app.quit()
  })

app.on("before-quit", () => {
  markQuitting()
  stopWorker()
  void disconnectDatabase()
})

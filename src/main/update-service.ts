import { app } from "electron"
import electronUpdater from "electron-updater"
import https from "node:https"

import type { UpdateInfo } from "../shared/types"

const { autoUpdater } = electronUpdater
const repository = "Re3ker/ADHDWorker"
const releasesUrl = `https://github.com/${repository}/releases/latest`
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let current: UpdateInfo | null = null
let onChange: (update: UpdateInfo) => void = () => undefined

export function getAvailableUpdate() {
  return current
}

function publish(update: UpdateInfo) {
  current = update
  onChange(update)
}

/** Die portable EXE kann sich nicht selbst ersetzen – dort nur ein Hinweis. */
function isPortable() {
  return Boolean(process.env.PORTABLE_EXECUTABLE_DIR)
}

function versionParts(version: string) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  return match ? match.slice(1).map(Number) : null
}

function isNewer(candidate: string, installed: string) {
  const a = versionParts(candidate)
  const b = versionParts(installed)
  if (!a || !b) return false
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index]
  }
  return false
}

function latestReleaseTag() {
  return new Promise<string | null>((resolve) => {
    const request = https.get(
      `https://api.github.com/repos/${repository}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "ADHDWorker",
        },
        timeout: 5000,
      },
      (response) => {
        let body = ""
        response.setEncoding("utf8")
        response.on("data", (chunk) => (body += chunk))
        response.on("end", () => {
          try {
            const release = JSON.parse(body) as {
              tag_name?: unknown
              prerelease?: unknown
            }
            resolve(
              response.statusCode === 200 &&
                !release.prerelease &&
                typeof release.tag_name === "string"
                ? release.tag_name
                : null
            )
          } catch {
            resolve(null)
          }
        })
      }
    )
    request.on("timeout", () => {
      request.destroy()
      resolve(null)
    })
    request.on("error", () => resolve(null))
  })
}

/** Nur Hinweis + Link (portable EXE oder wenn der Auto-Updater scheitert). */
async function checkLinkOnly() {
  const tag = await latestReleaseTag()
  const version = tag?.replace(/^v/, "")
  if (version && isNewer(version, app.getVersion())) {
    publish({ version, releaseUrl: releasesUrl, state: "available" })
  }
}

/**
 * Installierte Version: lädt Updates im Hintergrund und installiert sie beim
 * Beenden oder auf Knopfdruck. Portable Version: nur Hinweis mit Link.
 */
export function startUpdateChecks(listener: (update: UpdateInfo) => void) {
  onChange = listener
  if (!app.isPackaged) return

  if (isPortable()) {
    void checkLinkOnly()
    setInterval(() => void checkLinkOnly(), CHECK_INTERVAL_MS)
    return
  }

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on("update-available", (info) =>
    publish({
      version: info.version,
      releaseUrl: releasesUrl,
      state: "downloading",
    })
  )
  autoUpdater.on("update-downloaded", (info) =>
    publish({ version: info.version, releaseUrl: releasesUrl, state: "ready" })
  )
  autoUpdater.on("error", (error) => {
    console.error("Auto-Update fehlgeschlagen:", error)
    void checkLinkOnly()
  })

  const check = () => void autoUpdater.checkForUpdates().catch(() => undefined)
  check()
  setInterval(check, CHECK_INTERVAL_MS)
}

/** Heruntergeladenes Update jetzt installieren und neu starten. */
export function installUpdate() {
  if (current?.state !== "ready") return
  autoUpdater.quitAndInstall(true, true)
}

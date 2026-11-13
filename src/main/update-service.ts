import { app } from "electron"
import https from "node:https"

export type UpdateInfo = { version: string; releaseUrl: string }

const repository = "Re3ker/ADHDWorker"

function versionParts(version: string) {
  const match = version.match(/^v?(\d+)\.(\d+)\.(\d+)$/)
  return match ? match.slice(1).map(Number) : null
}

function isNewer(candidate: string, current: string) {
  const candidateParts = versionParts(candidate)
  const currentParts = versionParts(current)
  if (!candidateParts || !currentParts) return false
  return candidateParts.some(
    (part, index) =>
      part !== currentParts[index] &&
      part > currentParts[index] &&
      candidateParts
        .slice(0, index)
        .every((value, previous) => value === currentParts[previous])
  )
}

function requestLatestRelease() {
  return new Promise<{
    tag_name?: unknown
    html_url?: unknown
    prerelease?: unknown
  } | null>((resolve) => {
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
        response.on("data", (chunk) => {
          body += chunk
        })
        response.on("end", () => {
          if (response.statusCode !== 200) return resolve(null)
          try {
            resolve(
              JSON.parse(body) as {
                tag_name?: unknown
                html_url?: unknown
                prerelease?: unknown
              }
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

let availableUpdate: UpdateInfo | null = null

export function getAvailableUpdate() {
  return availableUpdate
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!app.isPackaged) return null
  const release = await requestLatestRelease()
  if (
    !release ||
    release.prerelease ||
    typeof release.tag_name !== "string" ||
    typeof release.html_url !== "string"
  )
    return null
  const version = release.tag_name.replace(/^v/, "")
  availableUpdate = isNewer(version, app.getVersion())
    ? { version, releaseUrl: release.html_url }
    : null
  return availableUpdate
}

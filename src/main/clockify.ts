import { appendFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

export type ClockifyOption = { id: string; name: string }

const API_BASE = "https://api.clockify.me/api/v1"
let diagnosticDirectory = join(process.cwd(), "logs", "ADHDWorker")

export function configureClockifyDiagnostics(directory: string) { diagnosticDirectory = directory }

function messageFor(response: Response, body: unknown) {
  if (response.status === 401 || response.status === 403) return "Clockify-Key prüfen und erneut versuchen."
  if (body && typeof body === "object" && "message" in body && typeof body.message === "string") return body.message
  return `Clockify antwortet mit ${response.status}. Bitte später erneut versuchen.`
}

function errorDetails(error: unknown) {
  if (error instanceof Error) {
    const cause = error.cause && typeof error.cause === "object" ? error.cause : null
    const code = cause && "code" in cause && typeof cause.code === "string" ? ` (${cause.code})` : ""
    return `${error.name}: ${error.message}${code}`
  }
  return String(error)
}

async function logClockify(event: string, details: Record<string, unknown>) {
  const line = `${new Date().toISOString()} ${event} ${JSON.stringify(details)}\n`
  try {
    await mkdir(diagnosticDirectory, { recursive: true })
    await appendFile(join(diagnosticDirectory, "clockify.log"), line, "utf8")
  } catch { console.error("Clockify-Diagnose konnte nicht geschrieben werden:", line) }
}

async function request<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  if (!apiKey) throw new Error("Hinterlege zuerst deinen Clockify-Key in den Einstellungen.")
  const method = init?.method ?? "GET"
  const attempts = method === "GET" ? 3 : 1
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(`${API_BASE}${path}`, { ...init, signal: AbortSignal.timeout(15_000), headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", ...init?.headers } })
      const body: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        await logClockify("response-error", { method, path, status: response.status, statusText: response.statusText, requestId: response.headers.get("x-request-id"), body })
        throw new Error(messageFor(response, body))
      }
      if (attempt > 1) await logClockify("recovered-after-retry", { method, path, attempt })
      return body as T
    } catch (error) {
      lastError = error
      const isHttpError = error instanceof Error && /^Clockify (antwortet|Key)/.test(error.message)
      if (isHttpError || attempt === attempts) break
      await logClockify("network-retry", { method, path, attempt, error: errorDetails(error) })
      await new Promise((resolve) => setTimeout(resolve, attempt * 350))
    }
  }
  await logClockify("request-failed", { method, path, attempts, error: errorDetails(lastError) })
  if (lastError instanceof Error && !/^Clockify (antwortet|Key)/.test(lastError.message)) throw new Error("Clockify ist gerade nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.")
  throw lastError
}

async function legacyRequest<T>(apiKey: string, path: string, init?: RequestInit): Promise<T> {
  if (!apiKey) throw new Error("Hinterlege zuerst deinen Clockify-Key in den Einstellungen.")
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", ...init?.headers } })
  } catch {
    throw new Error("Clockify ist gerade nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.")
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw new Error(messageFor(response, body))
  return body as T
}

void legacyRequest

function options(items: unknown): ClockifyOption[] {
  if (!Array.isArray(items)) throw new Error("Clockify hat eine unerwartete Antwort gesendet.")
  return items.flatMap((item) => item && typeof item === "object" && typeof item.id === "string" && typeof item.name === "string" ? [{ id: item.id, name: item.name }] : [])
}

export async function listClockifyWorkspaces(apiKey: string) {
  return options(await request<unknown>(apiKey, "/workspaces"))
}

export async function listClockifyProjects(apiKey: string, workspaceId: string) {
  const result: ClockifyOption[] = []
  for (let page = 1; page <= 100; page += 1) {
    const values = options(await request<unknown>(apiKey, `/workspaces/${encodeURIComponent(workspaceId)}/projects?archived=false&page=${page}&page-size=100`))
    result.push(...values)
    if (values.length < 100) break
  }
  return result.sort((a, b) => a.name.localeCompare(b.name, "de"))
}

export async function createClockifyTimeEntry(apiKey: string, entry: { workspaceId: string; projectId: string; description: string; startedAt: Date; endedAt: Date }) {
  return request<{ id?: string }>(apiKey, `/workspaces/${encodeURIComponent(entry.workspaceId)}/time-entries`, {
    method: "POST",
    body: JSON.stringify({ description: entry.description, projectId: entry.projectId, start: entry.startedAt.toISOString(), end: entry.endedAt.toISOString(), billable: false, type: "REGULAR" }),
  })
}

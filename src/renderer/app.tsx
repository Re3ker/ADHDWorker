import { useCallback, useEffect, useState } from "react"
import { Download, X } from "lucide-react"

import type {
  DashboardData,
  SettingsData,
  WorkdayData,
  UpdateInfo,
} from "../shared/types"
import { AppShell, type Page } from "./components/app-shell"
import { Dashboard } from "./components/dashboard/dashboard"
import { HistoryView } from "./components/history/history-view"
import {
  SettingsForm,
  type SettingsSaveState,
} from "./components/settings/settings-form"
import { DaySummaryDialog } from "./components/dialogs/day-summary-dialog"

const TITLES: Record<Page, string> = {
  dashboard: "Dein Arbeitstag",
  history: "Verlauf",
  settings: "Einstellungen",
}

export function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [history, setHistory] = useState<WorkdayData[] | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [summary, setSummary] = useState<WorkdayData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SettingsSaveState>(null)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      // Dashboard immer laden: Erinnerungen müssen auf jeder Seite erscheinen.
      setDashboard(await window.adhdworker.getDashboard())
      if (page === "history") setHistory(await window.adhdworker.getHistory())
      // Werte können sich außerhalb des Formulars ändern (z. B. gemerkte Pausenzeit).
      if (page === "settings")
        setSettings(await window.adhdworker.getSettings())
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Daten konnten nicht geladen werden."
      )
    }
  }, [page])

  useEffect(() => {
    void load()
    return window.adhdworker.onChanged(() => void load())
  }, [load])

  useEffect(() => {
    if (page === "settings")
      void window.adhdworker.getSettings().then(setSettings)
  }, [page])

  useEffect(() => {
    void window.adhdworker.getUpdate().then(setUpdate)
    const offUpdate = window.adhdworker.onUpdateAvailable(setUpdate)
    // Nach dem Feierabend direkt die Zeiten zum Kopieren zeigen.
    const offFinished = window.adhdworker.onDayFinished(async () => {
      const data = await window.adhdworker.getDashboard()
      setDashboard(data)
      setPage("dashboard")
      setSummary(data.finishedToday)
    })
    return () => {
      offUpdate()
      offFinished()
    }
  }, [])

  useEffect(() => {
    if (saveState !== "saved") return
    const timeout = window.setTimeout(() => setSaveState(null), 2500)
    return () => window.clearTimeout(timeout)
  }, [saveState])

  // Erinnerungen haben Vorrang – egal auf welcher Seite man gerade ist.
  const reminderActive = Boolean(dashboard?.reminder)
  const visiblePage: Page = reminderActive ? "dashboard" : page

  let content: React.ReactNode
  if (error) {
    content = (
      <section
        className="rounded-3xl border border-destructive/50 bg-destructive/10 p-6"
        role="alert"
      >
        <h2 className="text-lg font-semibold">
          Daten konnten nicht geladen werden.
        </h2>
        <p className="mt-2 text-sm text-destructive">{error}</p>
        <button
          type="button"
          className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={() => void load()}
        >
          Erneut versuchen
        </button>
      </section>
    )
  } else if (visiblePage === "dashboard") {
    content = dashboard ? (
      <Dashboard
        data={dashboard}
        summary={summary}
        onSummary={setSummary}
        onOpenSettings={() => setPage("settings")}
      />
    ) : (
      <Loading />
    )
  } else if (visiblePage === "history") {
    content = history ? (
      <HistoryView days={history} onSummary={setSummary} />
    ) : (
      <Loading />
    )
  } else {
    content = settings ? (
      <SettingsForm initial={settings} onSaveState={setSaveState} />
    ) : (
      <Loading />
    )
  }

  return (
    <AppShell
      page={visiblePage}
      title={TITLES[visiblePage]}
      status={
        dashboard?.workday?.status ??
        (dashboard?.finishedToday ? "finished" : undefined)
      }
      saveState={visiblePage === "settings" ? saveState : null}
      onNavigate={setPage}
    >
      {update ? (
        <section className="update-banner" role="status">
          <Download />
          <div>
            <strong>
              ADHDWorker {update.version}{" "}
              {update.state === "downloading"
                ? "wird geladen …"
                : "ist bereit."}
            </strong>
            <p>
              {update.state === "ready"
                ? "Wird beim Beenden automatisch installiert."
                : update.state === "downloading"
                  ? "Das Update lädt im Hintergrund."
                  : "Eine neue Version wartet auf GitHub."}
            </p>
          </div>
          {update.state === "ready" ? (
            <button
              type="button"
              className="update-link"
              onClick={() => window.adhdworker.installUpdate()}
            >
              Jetzt neu starten
            </button>
          ) : update.state === "available" ? (
            <button
              type="button"
              className="update-link"
              onClick={() => window.adhdworker.openReleasePage()}
            >
              Release öffnen
            </button>
          ) : null}
          <button
            type="button"
            className="update-dismiss"
            aria-label="Schließen"
            onClick={() => setUpdate(null)}
          >
            <X />
          </button>
        </section>
      ) : null}
      {content}
      {summary && visiblePage === "history" ? (
        <DaySummaryDialog workday={summary} onClose={() => setSummary(null)} />
      ) : null}
    </AppShell>
  )
}

function Loading() {
  return (
    <section className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      Wird geladen …
    </section>
  )
}

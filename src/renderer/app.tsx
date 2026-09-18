import { useCallback, useEffect, useState } from "react"
import { Download, X } from "lucide-react"

import { AppShell } from "./components/app-shell"
import { WorkDashboard } from "./components/dashboard/work-dashboard"
import { HistoryView } from "./components/history/history-view"
import { SettingsForm, type SettingsSaveState } from "./components/settings/settings-form"
import { ThemeProvider } from "./components/theme-provider"
import type { DashboardData, HistoryDay, SettingsData } from "../shared/types"

type Page = "dashboard" | "history" | "settings"

export function App() {
  const [page, setPage] = useState<Page>("dashboard")
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [history, setHistory] = useState<HistoryDay[] | null>(null)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settingsSaveState, setSettingsSaveState] = useState<SettingsSaveState>(null)
  const [update, setUpdate] = useState<{ version: string; releaseUrl: string } | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)

  useEffect(() => {
    if (settingsSaveState !== "saved") return
    const timeout = window.setTimeout(() => setSettingsSaveState(null), 3000)
    return () => window.clearTimeout(timeout)
  }, [settingsSaveState])

  const load = useCallback(async (target: Page) => {
    try {
      setError(null)
      if (target === "dashboard") setDashboard(await window.adhdworker.getDashboard())
      if (target === "history") setHistory(await window.adhdworker.getHistory())
      if (target === "settings") setSettings(await window.adhdworker.getSettings())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Daten konnten nicht geladen werden.")
    }
  }, [])

  useEffect(() => { void load(page) }, [load, page])

  useEffect(() => window.adhdworker.onChanged(() => { void load(page) }), [load, page])

  useEffect(() => {
    void window.adhdworker.getUpdate().then(setUpdate)
    return window.adhdworker.onUpdateAvailable(setUpdate)
  }, [])

  const content = error ? (
    <section className="rounded-3xl border border-destructive/50 bg-destructive/10 p-6" role="alert">
      <h1 className="text-lg font-semibold">ADHDWorker konnte die Daten nicht laden.</h1>
      <p className="mt-2 text-sm text-destructive">{error}</p>
      <button type="button" className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground" onClick={() => void load(page)}>Erneut versuchen</button>
    </section>
  ) : page === "dashboard" ? (
    dashboard ? <WorkDashboard initial={dashboard} /> : <Loading />
  ) : page === "history" ? (
    history ? <HistoryView days={history} /> : <Loading />
  ) : (
    settings ? <SettingsForm initial={settings} onSaveState={setSettingsSaveState} /> : <Loading />
  )

  return (
    <ThemeProvider>
      <AppShell page={page} pageTitle={page === "dashboard" ? "Heute im Fokus" : page === "history" ? "Dein Verlauf" : "Einstellungen"} workdayStatus={dashboard?.workday?.status} settingsSaveState={settingsSaveState} onNavigate={setPage}>
        {update && !updateDismissed ? <section className="update-banner" role="status"><Download /><div><strong>ADHDWorker {update.version} ist bereit.</strong><p>Eine neue Version wartet auf GitHub auf dich.</p></div><button type="button" className="update-link" onClick={() => window.adhdworker.openReleasePage()}>Release öffnen</button><button type="button" className="update-dismiss" aria-label="Update-Hinweis schließen" onClick={() => setUpdateDismissed(true)}><X /></button></section> : null}
        {content}
      </AppShell>
    </ThemeProvider>
  )
}

function Loading() {
  return <section className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Daten werden geladen …</section>
}

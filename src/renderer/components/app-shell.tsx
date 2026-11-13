import { useEffect, useState } from "react"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Cloud,
  LayoutDashboard,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Settings,
  Square,
  X,
} from "lucide-react"

import type { WorkdayStatus } from "../../shared/types"
import type { SettingsSaveState } from "./settings/settings-form"

const appIcon = new URL("../assets/app-icon.png", import.meta.url).href

export type Page = "dashboard" | "history" | "settings"

const STATUS_LABEL: Record<WorkdayStatus, string> = {
  planned: "Anmeldung vorgemerkt",
  working: "Angemeldet",
  paused: "In der Pause",
  finished: "Feierabend",
  cancelled: "Nicht angemeldet",
}

const NAVIGATION = [
  { page: "dashboard" as const, label: "Heute", icon: LayoutDashboard },
  { page: "history" as const, label: "Verlauf", icon: BookOpen },
  { page: "settings" as const, label: "Einstellungen", icon: Settings },
]

type AppShellProps = {
  children: React.ReactNode
  page: Page
  title: string
  status?: WorkdayStatus
  saveState: SettingsSaveState
  onNavigate: (page: Page) => void
}

export function AppShell({
  children,
  page,
  title,
  status,
  saveState,
  onNavigate,
}: AppShellProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  useEffect(() => {
    void window.adhdworker
      .getWindowState()
      .then((state) => setIsMaximized(state.isMaximized))
    return window.adhdworker.onWindowState((state) =>
      setIsMaximized(state.isMaximized)
    )
  }, [])

  return (
    <main className="app-frame text-foreground">
      <div className="titlebar">
        <div className="titlebar-drag">
          <img src={appIcon} alt="" className="size-4" />
          <span>ADHDWorker</span>
        </div>
        <div className="window-controls" aria-label="Fenstersteuerung">
          <button
            type="button"
            aria-label="Minimieren"
            onClick={() => window.adhdworker.minimizeWindow()}
          >
            <Minimize2 />
          </button>
          <button
            type="button"
            aria-label={isMaximized ? "Wiederherstellen" : "Maximieren"}
            onClick={() => window.adhdworker.toggleMaximizeWindow()}
          >
            {isMaximized ? <Square /> : <Maximize2 />}
          </button>
          <button
            type="button"
            className="window-close"
            aria-label="Schließen"
            onClick={() => window.adhdworker.closeWindow()}
          >
            <X />
          </button>
        </div>
      </div>
      <div className="desktop-layout">
        <aside className="sidebar">
          <button
            type="button"
            className="brand"
            onClick={() => onNavigate("dashboard")}
          >
            <span className="brand-mark">
              <img src={appIcon} alt="" />
            </span>
            <span>
              <strong>ADHDWorker</strong>
              <small>Nie wieder vergessen</small>
            </span>
          </button>
          <nav aria-label="Hauptnavigation" className="sidebar-nav">
            {NAVIGATION.map(({ page: target, label, icon: Icon }) => (
              <button
                key={target}
                type="button"
                className={page === target ? "active" : ""}
                aria-current={page === target ? "page" : undefined}
                onClick={() => onNavigate(target)}
              >
                <Icon />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className={`sidebar-status ${status ?? "none"}`}>
            <span className="status-dot" />
            <div>
              <p>Status</p>
              <strong>
                {status ? STATUS_LABEL[status] : "Nicht angemeldet"}
              </strong>
            </div>
          </div>
        </aside>
        <section className="content-area">
          <header className="content-header">
            <h1>{title}</h1>
            {saveState ? <SaveIndicator state={saveState} /> : null}
          </header>
          <div className="content-scroll">{children}</div>
        </section>
      </div>
    </main>
  )
}

function SaveIndicator({ state }: { state: NonNullable<SettingsSaveState> }) {
  if (state === "pending")
    return (
      <div className="settings-save-indicator">
        <Cloud /> Änderungen bereit
      </div>
    )
  if (state === "saving")
    return (
      <div className="settings-save-indicator">
        <LoaderCircle className="animate-spin" /> Wird gespeichert …
      </div>
    )
  if (state === "error")
    return (
      <div className="settings-save-indicator is-error">
        <AlertCircle /> Bitte Wert prüfen
      </div>
    )
  return (
    <div className="settings-save-indicator is-saved">
      <CheckCircle2 /> Gespeichert
    </div>
  )
}

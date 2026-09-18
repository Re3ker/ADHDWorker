import { useEffect, useState } from "react"
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, Cloud, LayoutDashboard, LoaderCircle, Maximize2, Minimize2, Settings, Sparkles, Square, X } from "lucide-react"

const appIcon = new URL("../assets/app-icon.png", import.meta.url).href

type Page = "dashboard" | "history" | "settings"
type AppShellProps = { children: React.ReactNode; page: Page; pageTitle: string; workdayStatus?: string; settingsSaveState?: "pending" | "saving" | "saved" | "error" | null; onNavigate: (page: Page) => void }

const statusLabel: Record<string, string> = { planned: "Start geplant", working: "Arbeit läuft", paused: "Pause läuft", finished: "Heute abgeschlossen", cancelled: "Planung abgebrochen" }

export function AppShell({ children, page, pageTitle, workdayStatus, settingsSaveState, onNavigate }: AppShellProps) {
  const [isMaximized, setIsMaximized] = useState(false)
  useEffect(() => {
    void window.adhdworker.getWindowState().then((state) => setIsMaximized(state.isMaximized))
    return window.adhdworker.onWindowState((state) => setIsMaximized(state.isMaximized))
  }, [])
  const navigation = [{ page: "dashboard" as const, label: "Heute", icon: LayoutDashboard }, { page: "history" as const, label: "Verlauf", icon: BookOpen }, { page: "settings" as const, label: "Einstellungen", icon: Settings }]
  return <main className="app-frame text-foreground">
    <div className="titlebar"><div className="titlebar-drag"><Sparkles className="size-4 text-primary" /><span>ADHDWorker</span></div><div className="window-controls" aria-label="Fenstersteuerung"><button type="button" aria-label="Minimieren" onClick={() => window.adhdworker.minimizeWindow()}><Minimize2 /></button><button type="button" aria-label={isMaximized ? "Wiederherstellen" : "Maximieren"} onClick={() => window.adhdworker.toggleMaximizeWindow()}>{isMaximized ? <Square /> : <Maximize2 />}</button><button type="button" className="window-close" aria-label="Schließen" onClick={() => window.adhdworker.closeWindow()}><X /></button></div></div>
    <div className="desktop-layout"><aside className="sidebar"><button type="button" className="brand" onClick={() => onNavigate("dashboard")}><span className="brand-mark"><img src={appIcon} alt="" /></span><span><strong>ADHDWorker</strong><small>Dein Fokus für heute</small></span></button><nav aria-label="Hauptnavigation" className="sidebar-nav">{navigation.map(({ page: target, label, icon: Icon }) => <button key={target} type="button" className={page === target ? "active" : ""} aria-current={page === target ? "page" : undefined} onClick={() => onNavigate(target)}><Icon /><span>{label}</span></button>)}</nav><div className={`sidebar-status ${workdayStatus || "none"}`}><span className="status-dot" /><div><p>Arbeitsstatus</p><strong>{statusLabel[workdayStatus || ""] || "Bereit für heute"}</strong></div></div></aside><section className="content-area"><header className="content-header"><div>{page !== "dashboard" ? <button type="button" className="back-link" onClick={() => onNavigate("dashboard")}><ChevronLeft /> Heute</button> : <p className="eyebrow">DEIN ARBEITSTAG</p>}<h1>{pageTitle}</h1></div>{page === "settings" && settingsSaveState ? <SettingsSaveIndicator state={settingsSaveState} /> : null}</header><div className="content-scroll">{children}</div></section></div>
  </main>
}

function SettingsSaveIndicator({ state }: { state: NonNullable<AppShellProps["settingsSaveState"]> }) {
  if (state === "pending") return <div className="settings-save-indicator"><Cloud /> Änderungen bereit</div>
  if (state === "saving") return <div className="settings-save-indicator"><LoaderCircle className="animate-spin" /> Wird gespeichert …</div>
  if (state === "error") return <div className="settings-save-indicator is-error"><AlertCircle /> Bitte Wert prüfen</div>
  return <div className="settings-save-indicator is-saved"><CheckCircle2 /> Gespeichert</div>
}

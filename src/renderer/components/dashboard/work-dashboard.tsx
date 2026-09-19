import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { Check, Clipboard, Clock3, Coffee, MessageCircle, Pencil, Play, Plus, RefreshCw, RotateCcw, Send, Settings2, Square, Trash2 } from "lucide-react"

import { Button } from "../ui/button"
import { createClockifyExport, createClockifyLines, getNetMinutes } from "../../../shared/clockify-export"
import { formatDate, formatDateLong, formatDurationMinutes, formatTime } from "../../../shared/time"
import type { ClockifyOption, DashboardData, SessionData, WorkdayData } from "../../../shared/types"

function notifyDesktop(settings: DashboardData["settings"], title: string, body: string) {
  if (settings.desktopNotifications) window.adhdworker.notify({ title, body })
}

function useActionFeedback() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  function run(action: () => Promise<{ ok: boolean; error?: string }>, success?: string) {
    setError(null); setNotice(null)
    startTransition(async () => { const result = await action(); if (!result.ok) setError(result.error || "Aktion fehlgeschlagen."); else if (success) setNotice(success) })
  }
  return { isPending, error, notice, setError, setNotice, run }
}

function netMinutes(sessions: SessionData[], now: number) {
  return sessions.reduce((total, session) => {
    if (session.type !== "work") return total
    const end = session.endedAt ? new Date(session.endedAt).getTime() : now
    return total + Math.max(0, Math.floor((end - new Date(session.startedAt).getTime()) / 60000))
  }, 0)
}

export function WorkDashboard({ initial }: { initial: DashboardData }) {
  const data = initial
  const [now, setNow] = useState(0)
  const [startOpen, setStartOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(initial.workday?.status === "finished")
  const [taskText, setTaskText] = useState("")
  const [editingTask, setEditingTask] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const feedback = useActionFeedback()

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])

  const currentSession = data.workday?.sessions.find((session) => !session.endedAt) ?? null
  const workSessions = useMemo(() => data.workday?.sessions.filter((session) => session.type === "work") ?? [], [data.workday?.sessions])
  const minutes = data.workday ? netMinutes(data.workday.sessions, now) : 0
  const exportLines = useMemo(() => createClockifyLines(workSessions.filter((session) => session.endedAt)), [workSessions])
  const exportText = useMemo(() => createClockifyExport(workSessions.filter((session) => session.endedAt)), [workSessions])

  async function refreshAfter(action: () => Promise<{ ok: boolean; error?: string }>, success?: string, notification?: { title: string; body: string }) {
    feedback.run(async () => { const result = await action(); if (result.ok) { if (notification) notifyDesktop(initial.settings, notification.title, notification.body); window.location.reload() }; return result }, success)
  }
  function handleStart(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formData = new FormData(event.currentTarget)
    feedback.run(async () => { const result = await window.adhdworker.planWorkday({ date: String(formData.get("date") || ""), time: String(formData.get("time") || "") }); if (result.ok) { setStartOpen(false); notifyDesktop(initial.settings, "Arbeitstag geplant", "Der Arbeitsstart wurde gespeichert."); window.location.reload() }; return result })
  }
  function handleTask(selection: { workspace?: ClockifyOption; project?: ClockifyOption }) {
    if (!currentSession || !taskText.trim()) return
    feedback.run(async () => { const result = await window.adhdworker.createTask({ workSessionId: currentSession.id, content: taskText, workspaceId: selection.workspace?.id ?? null, workspaceName: selection.workspace?.name ?? null, projectId: selection.project?.id ?? null, projectName: selection.project?.name ?? null }); if (result.ok) setTaskText(""); return result })
  }
  function handleEdit(taskId: string) { const task = data.workday?.sessions.flatMap((session) => session.tasks).find((item) => item.id === taskId); if (task) { setEditingTask(taskId); setEditText(task.content) } }
  function saveEdit(taskId: string) { refreshAfter(() => window.adhdworker.updateTask({ taskId, content: editText }), "Aufgabe gespeichert."); setEditingTask(null) }
  function removeTask(taskId: string) { if (!window.confirm("Aufgabe wirklich löschen?")) return; refreshAfter(() => window.adhdworker.deleteTask(taskId)) }
  function copy(text: string) { navigator.clipboard.writeText(text).then(() => feedback.setNotice("Kopiert."), () => feedback.setError("Kopieren nicht möglich.")) }

  const status = data.workday?.status ?? "none"
  useEffect(() => {
    if (status !== "planned" || !data.workday?.scheduledStartAt) return
    const scheduledAt = new Date(data.workday.scheduledStartAt).getTime()
    let interval: number | undefined
    const timeout = window.setTimeout(() => {
      window.location.reload()
      interval = window.setInterval(() => window.location.reload(), 10_000)
    }, Math.max(0, scheduledAt - Date.now()))
    return () => {
      window.clearTimeout(timeout)
      if (interval !== undefined) window.clearInterval(interval)
    }
  }, [data.workday?.scheduledStartAt, status])
  const statusCopy = {
    none: { eyebrow: "Heute", title: "Noch nicht gestartet", description: "Plane deinen Arbeitstag mit einer Startzeit.", icon: Play },
    planned: { eyebrow: "Geplant", title: "Arbeitsstart steht fest", description: `Start um ${formatTime(data.workday?.scheduledStartAt)}.`, icon: Clock3 },
    working: { eyebrow: "Aktiv", title: "Arbeit läuft", description: "Eine klare nächste Aktion reicht.", icon: Play },
    paused: { eyebrow: "Pause", title: "Pause läuft", description: `Seit ${formatTime(currentSession?.startedAt)}.`, icon: Coffee },
    finished: { eyebrow: "Fertig", title: "Arbeitstag abgeschlossen", description: "Deine Zeiten und Aufgaben sind gespeichert.", icon: Check },
    cancelled: { eyebrow: "Abgebrochen", title: "Planung abgebrochen", description: "Du kannst einen neuen Arbeitstag planen.", icon: RotateCcw },
  }[status]
  const StatusIcon = statusCopy.icon

  return <div className="flex flex-1 flex-col gap-6">
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8" aria-labelledby="status-heading">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-4"><div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><StatusIcon aria-hidden="true" /></div><div><p className="text-sm font-medium text-primary">{statusCopy.eyebrow}</p><h1 id="status-heading" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{statusCopy.title}</h1><p className="mt-2 text-muted-foreground">{statusCopy.description}</p></div></div>{data.workday && status !== "planned" && status !== "finished" && status !== "cancelled" ? <div className="rounded-2xl bg-muted px-5 py-3 text-right"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Nettozeit</p><p className="mt-1 font-mono text-2xl font-semibold text-foreground">{formatDurationMinutes(minutes)}</p></div> : null}</div>
      {status === "planned" && data.workday ? <div className="mt-7 flex flex-col gap-3 rounded-2xl bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm">Geplanter Start: <strong>{formatDateLong(data.workday.scheduledStartAt)} um {formatTime(data.workday.scheduledStartAt)}</strong></p><Button variant="outline" onClick={() => refreshAfter(() => window.adhdworker.cancelWorkday())} disabled={feedback.isPending}>Planung abbrechen</Button></div> : null}
      {status === "none" || status === "cancelled" || status === "finished" ? <Button size="lg" className="mt-7 min-h-12 w-full sm:w-auto" onClick={() => setStartOpen(true)}><Play /> {status === "finished" ? "Neuen Arbeitstag starten" : "Arbeit starten"}</Button> : null}
    {status === "paused" ? <Button size="lg" className="mt-7 min-h-12 w-full sm:w-auto" onClick={() => refreshAfter(() => window.adhdworker.resumeWorkday(), "Arbeit fortgesetzt.", { title: "Arbeit fortgesetzt", body: "Die Arbeitszeit läuft weiter." })} disabled={feedback.isPending}><Play /> Arbeit fortsetzen</Button> : null}
    </section>

    {status === "working" && currentSession ? <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]"><div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium text-muted-foreground">Aktive Arbeitssession</p><p className="mt-1 text-lg font-semibold">Seit {formatTime(currentSession.startedAt)}</p></div><Clock3 className="text-primary" aria-hidden="true" /></div><TaskCapture taskText={taskText} setTaskText={setTaskText} defaults={initial.settings} pending={feedback.isPending} onSubmit={handleTask} /><TaskList sessions={data.workday?.sessions ?? []} editingTask={editingTask} editText={editText} setEditText={setEditText} onEdit={handleEdit} onSave={saveEdit} onDelete={removeTask} /></div><div className="flex flex-col gap-3 rounded-3xl border border-border bg-muted p-6 shadow-sm sm:p-7"><p className="text-sm font-medium text-muted-foreground">Arbeitsablauf</p><Button size="lg" variant="secondary" className="min-h-12 justify-start" onClick={() => refreshAfter(() => window.adhdworker.pauseWorkday(), "Pause gestartet.", { title: "Pause gestartet", body: "Die Arbeitszeit ist pausiert." })} disabled={feedback.isPending}><Coffee /> Pause starten</Button><Button size="lg" variant="outline" className="min-h-12 justify-start" onClick={() => { if (window.confirm("Arbeitstag jetzt beenden?")) refreshAfter(() => window.adhdworker.finishWorkday(), "Arbeitstag beendet.", { title: "Arbeitstag beendet", body: "Deine Zeiten und Aufgaben sind gespeichert." }) }} disabled={feedback.isPending}><Square /> Arbeit beenden</Button><p className="mt-auto pt-4 text-xs leading-relaxed text-muted-foreground">Pausenzeit wird nicht als Arbeitszeit exportiert.</p></div></section> : null}

    {feedback.error ? <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"><span className="font-semibold">Nicht gespeichert.</span><span>{feedback.error}</span></div> : null}{feedback.notice ? <div role="status" className="rounded-2xl border border-primary/50 bg-primary/10 p-4 text-sm text-primary">{feedback.notice}</div> : null}
    {data.workday?.messages.some((message) => message.status === "failed") ? <section className="rounded-3xl border border-destructive/50 bg-destructive/10 p-5" aria-labelledby="telegram-errors"><div className="flex items-center gap-2 text-destructive"><MessageCircle size={18} /><h2 id="telegram-errors" className="font-semibold">Telegram braucht Aufmerksamkeit</h2></div><div className="mt-3 space-y-3">{data.workday.messages.filter((message) => message.status === "failed").map((message) => <div key={message.id} className="flex flex-col gap-2 rounded-xl bg-card/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p>{message.errorMessage || "Versand fehlgeschlagen."}</p><Button size="sm" variant="outline" onClick={() => refreshAfter(() => window.adhdworker.retryTelegram(message.id))} disabled={feedback.isPending}><Send /> Erneut senden</Button></div>)}</div></section> : null}
    {data.workday?.clockifySyncEntries.some((entry) => entry.status !== "synced") ? <section className="rounded-3xl border border-destructive/50 bg-destructive/10 p-5" aria-labelledby="clockify-errors"><div className="flex items-center gap-2 text-destructive"><Clock3 size={18} /><h2 id="clockify-errors" className="font-semibold">Clockify braucht Aufmerksamkeit</h2></div><div className="mt-3 space-y-3">{data.workday.clockifySyncEntries.filter((entry) => entry.status !== "synced").map((entry) => <div key={entry.id} className="flex flex-col gap-2 rounded-xl bg-card/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"><p><strong>{entry.description}</strong><br />{entry.errorMessage || "Wartet auf die Übertragung."}</p><Button size="sm" variant="outline" onClick={() => refreshAfter(() => window.adhdworker.retryClockify(entry.id), "Clockify-Eintrag übertragen.")} disabled={feedback.isPending}><Send /> Erneut senden</Button></div>)}</div></section> : null}
    {status === "finished" ? <section className="flex flex-col gap-3 rounded-3xl border border-border bg-muted p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">Export ist bereit.</p><p className="mt-1 text-sm text-muted-foreground">Kopiere deine Clockify-Zeilen für heute.</p></div><Button size="lg" onClick={() => setExportOpen(true)}><Clipboard /> Clockify-Export öffnen</Button></section> : null}
    {startOpen ? <StartDialog defaultDate={initial.defaultDate} defaultTime={initial.settings.defaultStartTime || initial.defaultTime} onClose={() => setStartOpen(false)} onSubmit={handleStart} pending={feedback.isPending} /> : null}{exportOpen && data.workday ? <ExportDialog workday={data.workday} lines={exportLines} text={exportText} onClose={() => setExportOpen(false)} onCopy={copy} /> : null}
  </div>
}

function TaskCapture({ taskText, setTaskText, defaults, pending, onSubmit }: { taskText: string; setTaskText: (value: string) => void; defaults: DashboardData["settings"]; pending: boolean; onSubmit: (selection: { workspace?: ClockifyOption; project?: ClockifyOption }) => void }) {
  const [workspaces, setWorkspaces] = useState<ClockifyOption[]>([])
  const [projects, setProjects] = useState<ClockifyOption[]>([])
  const [workspaceId, setWorkspaceId] = useState(defaults.lastClockifyWorkspaceId ?? "")
  const [projectId, setProjectId] = useState(defaults.lastClockifyProjectId ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initialProjectLoad = useRef(true)
  const workspace = workspaces.find((item) => item.id === workspaceId)
  const project = projects.find((item) => item.id === projectId)
  async function loadWorkspaces() { setLoading(true); setError(null); const result = await window.adhdworker.getClockifyWorkspaces(); setLoading(false); if (!result.ok) { setError(result.error || "Workspaces konnten nicht geladen werden."); return }; setWorkspaces(result.items); if (workspaceId && !result.items.some((item) => item.id === workspaceId)) { setWorkspaceId(""); setProjectId(""); setProjects([]) } }
  async function loadProjects(id = workspaceId) { if (!id) { setProjects([]); return }; setLoading(true); setError(null); const result = await window.adhdworker.getClockifyProjects({ workspaceId: id }); setLoading(false); if (!result.ok) { setError(result.error || "Projekte konnten nicht geladen werden."); return }; setProjects(result.items); if (projectId && !result.items.some((item) => item.id === projectId)) setProjectId("") }
  useEffect(() => { if (defaults.hasClockifyApiKey) void loadWorkspaces() }, [])
  useEffect(() => { if (initialProjectLoad.current) { initialProjectLoad.current = false; return }; if (workspaceId && defaults.hasClockifyApiKey) void loadProjects(workspaceId) }, [workspaceId, workspaces.length])
  return <form className="mt-6 space-y-3" onSubmit={(event) => { event.preventDefault(); onSubmit({ workspace, project }) }}><div className="flex gap-2"><label className="sr-only" htmlFor="task-content">Neue Aufgabe</label><input id="task-content" value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="Was hast du erledigt?" className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50" maxLength={500} autoComplete="off" /><Button type="submit" size="lg" aria-label="Aufgabe speichern" disabled={!taskText.trim() || pending}><Plus /></Button></div>{defaults.hasClockifyApiKey ? <><div className="grid gap-2 sm:grid-cols-2"><label className="text-xs font-medium text-muted-foreground">Workspace<select value={workspaceId} onChange={(event) => { setWorkspaceId(event.target.value); setProjectId("") }} className="mt-1 min-h-10 w-full rounded-xl border border-input bg-background px-2 text-sm text-foreground"><option value="">Lokal speichern (ohne Clockify)</option>{workspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-medium text-muted-foreground">Projekt<select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={!workspaceId} className="mt-1 min-h-10 w-full rounded-xl border border-input bg-background px-2 text-sm text-foreground disabled:opacity-50"><option value="">Lokal speichern (ohne Clockify)</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><div className="flex items-center gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => void loadWorkspaces()} disabled={loading}><RefreshCw /> Workspaces aktualisieren</Button><Button type="button" size="sm" variant="ghost" onClick={() => void loadProjects()} disabled={loading || !workspaceId}><RefreshCw /> Projekte aktualisieren</Button>{loading ? <span className="text-xs text-muted-foreground">Lade Auswahl …</span> : null}</div>{error ? <p className="text-xs text-destructive">{error} Du kannst die Aufgabe trotzdem lokal speichern.</p> : null}</> : <p className="text-xs text-muted-foreground">Ohne Clockify-Key wird die Aufgabe lokal gespeichert. Den Key kannst du später in den Einstellungen hinterlegen.</p>}</form>
}

function TaskList({ sessions, editingTask, editText, setEditText, onEdit, onSave, onDelete }: { sessions: SessionData[]; editingTask: string | null; editText: string; setEditText: (value: string) => void; onEdit: (id: string) => void; onSave: (id: string) => void; onDelete: (id: string) => void }) {
  const tasks = sessions.flatMap((session) => session.tasks)
  if (tasks.length === 0) return <p className="mt-8 rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Noch keine Aufgaben. Der erste Eintrag darf klein sein.</p>
  return <ul className="mt-6 space-y-2">{tasks.map((task) => <li key={task.id} className="group flex items-start gap-3 rounded-xl border border-transparent bg-muted p-3 text-sm hover:border-border">{editingTask === task.id ? <div className="flex min-w-0 flex-1 gap-2"><input value={editText} onChange={(event) => setEditText(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring" autoFocus /><Button size="sm" onClick={() => onSave(task.id)}><Check /></Button></div> : <><span className="mt-0.5 text-primary">✓</span><span className="min-w-0 flex-1 break-words">{task.content}</span><div className="flex gap-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100"><Button size="icon-xs" variant="ghost" aria-label="Aufgabe bearbeiten" onClick={() => onEdit(task.id)}><Pencil /></Button><Button size="icon-xs" variant="ghost" aria-label="Aufgabe löschen" onClick={() => onDelete(task.id)}><Trash2 /></Button></div></>}</li>)}</ul>
}

function StartDialog({ defaultDate, defaultTime, onClose, onSubmit, pending }: { defaultDate: string; defaultTime: string; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 dark:bg-background/80 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="start-dialog-title"><div className="w-full max-w-lg rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Neuer Arbeitstag</p><h2 id="start-dialog-title" className="mt-1 text-2xl font-semibold">Wann möchtest du starten?</h2><p className="mt-2 text-muted-foreground">Der Arbeitstag beginnt zur ausgewählten Zeit. Ist sie bereits vorbei, startet er jetzt.</p></div><Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Dialog schließen">×</Button></div><form className="mt-7 space-y-5" onSubmit={onSubmit}><div className="grid grid-cols-2 gap-3"><label className="space-y-2 text-sm font-medium">Datum<input name="date" type="date" defaultValue={defaultDate} className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" required /></label><label className="space-y-2 text-sm font-medium">Startzeit<input name="time" type="time" defaultValue={defaultTime} className="mt-1 min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" required /></label></div><div className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground"><Settings2 className="mr-2 inline size-4 text-primary" /> Telegram und Vorlagen kommen aus den Einstellungen.</div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" onClick={onClose}>Abbrechen</Button><Button type="submit" size="lg" disabled={pending}><Play /> Arbeit planen</Button></div></form></div></div>
}

function ExportDialog({ workday, lines, text, onClose, onCopy }: { workday: WorkdayData; lines: ReturnType<typeof createClockifyLines>; text: string; onClose: () => void; onCopy: (text: string) => void }) {
  const net = getNetMinutes(workday.sessions.filter((session) => session.endedAt))
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 dark:bg-background/80 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl sm:rounded-3xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-primary">Clockify-Export</p><h2 id="export-dialog-title" className="mt-1 text-2xl font-semibold">{formatDate(workday.endedAt)}</h2><p className="mt-2 text-muted-foreground">Nettoarbeitszeit: <strong>{formatDurationMinutes(net)}</strong></p></div><Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Export schließen">×</Button></div><div className="mt-7 space-y-3">{lines.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Keine abgeschlossenen Work-Sessions vorhanden.</p> : lines.map((line) => <div key={line.sessionId} className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-4"><code className="min-w-0 flex-1 break-words text-sm leading-relaxed">{line.text}</code><Button size="icon-sm" variant="outline" aria-label="Zeile kopieren" onClick={() => onCopy(line.text)}><Clipboard /></Button></div>)}</div><div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end"><Button variant="outline" onClick={onClose}>Schließen</Button><Button size="lg" onClick={() => onCopy(text)} disabled={!text}><Clipboard /> Gesamten Export kopieren</Button></div></div></div>
}

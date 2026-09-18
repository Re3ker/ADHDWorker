"use client"

import Link from "next/link"
import { useState } from "react"
import { Clipboard, MessageCircle, RotateCcw } from "lucide-react"

import { retryTelegramAction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { createClockifyExport, createClockifyLines, getNetMinutes } from "@/lib/clockify-export"
import { formatDateLong, formatDurationMinutes, formatTime } from "@/lib/time"

type HistorySession = { id: string; type: "work" | "break"; startedAt: string; endedAt: string | null; tasks: Array<{ id: string; content: string }> }
type HistoryMessage = { id: string; type: "start" | "pause" | "resume" | "end"; status: "pending" | "sent" | "failed" | "cancelled"; errorMessage: string | null }
export type HistoryDay = { id: string; endedAt: string | null; actualStartAt: string | null; sessions: HistorySession[]; messages: HistoryMessage[] }

export function HistoryView({ days }: { days: HistoryDay[] }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)
  function copy(id: string, text: string) { navigator.clipboard.writeText(text).then(() => { setCopied(id); window.setTimeout(() => setCopied(null), 1800) }) }
  async function retry(id: string) { setRetrying(id); const form = new FormData(); form.set("messageId", id); await retryTelegramAction(form); window.location.reload() }
  if (days.length === 0) return <section className="rounded-3xl border border-dashed border-border bg-card p-10 text-center"><p className="text-lg font-semibold">Noch kein Verlauf</p><p className="mt-2 text-sm text-muted-foreground">Nach deinem ersten abgeschlossenen Arbeitstag erscheint er hier.</p><Link className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground" href="/">Zum Dashboard</Link></section>
  return <div className="space-y-5">{days.map((day) => { const lines = createClockifyLines(day.sessions.filter((session) => session.endedAt)); const text = createClockifyExport(day.sessions.filter((session) => session.endedAt)); const taskCount = day.sessions.reduce((sum, session) => sum + session.tasks.length, 0); return <article key={day.id} className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-primary">Arbeitstag</p><h2 className="mt-1 text-xl font-semibold">{formatDateLong(day.endedAt)}</h2><p className="mt-2 text-sm text-muted-foreground">{formatTime(day.actualStartAt)} – {formatTime(day.endedAt)} · {formatDurationMinutes(getNetMinutes(day.sessions.filter((session) => session.endedAt)))} netto · {taskCount} Aufgabe{taskCount === 1 ? "" : "n"}</p></div><Button variant="outline" onClick={() => copy(day.id, text)} disabled={!text}><Clipboard /> {copied === day.id ? "Kopiert" : "Export kopieren"}</Button></div><details className="mt-6 rounded-2xl bg-muted p-4"><summary className="cursor-pointer text-sm font-medium">Clockify-Zeilen anzeigen</summary><div className="mt-4 space-y-2">{lines.map((line) => <div key={line.sessionId} className="flex items-start gap-3 rounded-xl bg-card p-3"><code className="min-w-0 flex-1 break-words text-xs leading-relaxed">{line.text}</code><Button size="icon-sm" variant="ghost" aria-label="Zeile kopieren" onClick={() => copy(`${day.id}-${line.sessionId}`, line.text)}><Clipboard /></Button></div>)}</div></details><details className="mt-3 rounded-2xl bg-muted p-4"><summary className="cursor-pointer text-sm font-medium">Telegram-Protokoll</summary><div className="mt-4 space-y-2">{day.messages.map((message) => <div key={message.id} className="flex items-center justify-between gap-3 rounded-xl bg-card p-3 text-sm"><span className="flex items-center gap-2"><MessageCircle size={15} className="text-muted-foreground" />{message.type} · {message.status}{message.errorMessage ? ` · ${message.errorMessage}` : ""}</span>{message.status === "failed" ? <Button size="sm" variant="outline" onClick={() => retry(message.id)} disabled={retrying === message.id}><RotateCcw /> Erneut senden</Button> : null}</div>)}</div></details></article> })}</div>
}

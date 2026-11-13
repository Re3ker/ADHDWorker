import { Clipboard, MessageCircle } from "lucide-react"

import { netWorkMinutes } from "../../../shared/day-export"
import {
  formatDateLong,
  formatDuration,
  formatTime,
} from "../../../shared/time"
import type { WorkdayData } from "../../../shared/types"
import { ACTIONS } from "../../lib/actions"
import { Button } from "../ui/button"

const MESSAGE_STATUS = {
  pending: "wartet",
  sent: "gesendet",
  failed: "fehlgeschlagen",
  cancelled: "abgebrochen",
} as const

export function HistoryView({
  days,
  onSummary,
}: {
  days: WorkdayData[]
  onSummary: (workday: WorkdayData) => void
}) {
  if (days.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-lg font-semibold">Noch kein Verlauf</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nach deinem ersten Feierabend erscheint der Tag hier.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const taskCount = day.sessions.reduce(
          (sum, session) => sum + session.tasks.length,
          0
        )
        return (
          <article
            key={day.id}
            className="rounded-3xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  {formatDateLong(day.endedAt)}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatTime(day.actualStartAt)} – {formatTime(day.endedAt)} ·{" "}
                  {formatDuration(netWorkMinutes(day.sessions))} netto ·{" "}
                  {taskCount} Aufgabe
                  {taskCount === 1 ? "" : "n"}
                </p>
              </div>
              <Button variant="outline" onClick={() => onSummary(day)}>
                <Clipboard /> Zeiten kopieren
              </Button>
            </div>
            {day.messages.length > 0 ? (
              <details className="mt-4 rounded-2xl bg-muted p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  Telegram-Meldungen
                </summary>
                <ul className="mt-3 space-y-2 text-sm">
                  {day.messages.map((message) => (
                    <li key={message.id} className="flex items-center gap-2">
                      <MessageCircle className="size-4 text-muted-foreground" />
                      {ACTIONS[message.type]?.step ?? message.type} ·{" "}
                      {formatTime(message.sentAt)} ·{" "}
                      {MESSAGE_STATUS[message.status]}
                      {message.errorMessage ? ` · ${message.errorMessage}` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

import { useState } from "react"
import {
  CalendarCheck,
  Clipboard,
  MessageCircle,
  Send,
  Settings2,
} from "lucide-react"

import type {
  ActionType,
  DashboardData,
  WorkdayData,
} from "../../../shared/types"
import { ActionDialog } from "../dialogs/action-dialog"
import { DaySummaryDialog } from "../dialogs/day-summary-dialog"
import { Button } from "../ui/button"
import { StatusCard } from "./status-card"
import { TaskPanel } from "./task-panel"

type DashboardProps = {
  data: DashboardData
  summary: WorkdayData | null
  onSummary: (workday: WorkdayData | null) => void
  onOpenSettings: () => void
}

export function Dashboard({
  data,
  summary,
  onSummary,
  onOpenSettings,
}: DashboardProps) {
  const [manual, setManual] = useState<ActionType | null>(null)
  const workday = data.workday
  const failed = [
    ...(workday?.messages ?? []),
    ...(data.finishedToday?.messages ?? []),
  ].filter((message) => message.status === "failed")

  return (
    <div className="flex flex-col gap-6">
      {failed.length > 0 ? <TelegramAlert messages={failed} /> : null}

      {!data.settings.telegramReady ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-amber-400/40 bg-amber-400/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            <strong>Telegram ist noch nicht eingerichtet.</strong> Ohne Token
            und Chat-ID kann ADHDWorker dich nicht an- und abmelden.
          </p>
          <Button variant="outline" onClick={onOpenSettings}>
            <Settings2 /> Einrichten
          </Button>
        </section>
      ) : null}

      <StatusCard data={data} onAction={setManual} />

      {workday && workday.status !== "planned" ? (
        <TaskPanel workday={workday} />
      ) : null}

      {!workday && data.finishedToday ? (
        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <CalendarCheck className="text-primary" />
            <div>
              <p className="font-semibold">
                Deine Zeiten für heute sind bereit.
              </p>
              <p className="text-sm text-muted-foreground">
                Aufgaben, Start und Ende pro Abschnitt zum Kopieren.
              </p>
            </div>
          </div>
          <Button size="lg" onClick={() => onSummary(data.finishedToday)}>
            <Clipboard /> Zeiten kopieren
          </Button>
        </section>
      ) : null}

      {data.reminder ? (
        <ActionDialog
          key={`${data.reminder.type}-${data.reminder.dueAt}`}
          type={data.reminder.type}
          dueAt={data.reminder.dueAt}
          source="reminder"
          data={data}
          onClose={() => setManual(null)}
        />
      ) : manual ? (
        <ActionDialog
          type={manual}
          source="manual"
          data={data}
          onClose={() => setManual(null)}
        />
      ) : summary ? (
        <DaySummaryDialog workday={summary} onClose={() => onSummary(null)} />
      ) : null}
    </div>
  )
}

function TelegramAlert({ messages }: { messages: WorkdayData["messages"] }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  async function retry(id: string) {
    setBusy(id)
    const result = await window.adhdworker.retryTelegram(id)
    setBusy(null)
    setError(result.ok ? null : result.error)
  }

  return (
    <section
      role="alert"
      className="rounded-3xl border-2 border-destructive/70 bg-destructive/15 p-5"
    >
      <div className="flex items-center gap-2 text-destructive">
        <MessageCircle className="size-5" />
        <h2 className="text-lg font-semibold">
          Deine Meldung ist nicht angekommen!
        </h2>
      </div>
      <div className="mt-3 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className="flex flex-col gap-2 rounded-xl bg-card/80 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <p>{message.errorMessage || "Versand fehlgeschlagen."}</p>
            <Button
              onClick={() => void retry(message.id)}
              disabled={busy === message.id}
            >
              <Send /> Erneut senden
            </Button>
          </div>
        ))}
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </section>
  )
}

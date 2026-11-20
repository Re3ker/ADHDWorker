import { useState } from "react"
import { Bell, Check, Pencil, Timer, X } from "lucide-react"

import { computeDayPlan } from "../../../shared/day-plan"
import {
  addMinutes,
  formatDuration,
  formatTime,
  isWeekday,
  minutesBetween,
  todayAt,
} from "../../../shared/time"
import type {
  ActionResponse,
  ActionType,
  DashboardData,
} from "../../../shared/types"
import { ACTIONS, useNow } from "../../lib/actions"
import { Button } from "../ui/button"

type StepState = "done" | "next" | "open"

export function StatusCard({
  data,
  onAction,
}: {
  data: DashboardData
  onAction: (type: ActionType) => void
}) {
  const now = useNow()
  const { workday, settings } = data
  // Nach dem Feierabend ist kein Tag mehr offen – dann den heutigen zeigen.
  const day = workday ?? data.finishedToday
  const plan = computeDayPlan(now, settings, day)
  const status = day?.status ?? "none"
  const breakSession = day?.sessions.find((session) => session.type === "break")
  const hadBreak = Boolean(breakSession)
  const overtime = data.skippedReminders.includes("end")
  const extraMinutes = plan.netMinutes - settings.targetWorkMinutes

  const headline = {
    none: isWeekday(now) ? "Noch nicht angemeldet" : "Heute ist frei",
    planned: "Anmeldung vorgemerkt",
    working: overtime ? "Du machst Überstunden" : "Du bist angemeldet",
    paused: `Pause bis ${formatTime(plan.resumeAt)}`,
    finished: "Feierabend!",
    cancelled: "Noch nicht angemeldet",
  }[status]

  const started =
    status !== "none" && status !== "planned" && status !== "cancelled"
  const steps: Array<{ type: ActionType; time: string; state: StepState }> = [
    {
      type: "start",
      time: formatTime(plan.startAt),
      state: started ? "done" : "next",
    },
    {
      type: "pause",
      time: formatTime(plan.pauseAt),
      state: hadBreak ? "done" : status === "working" ? "next" : "open",
    },
    {
      type: "resume",
      time: formatTime(plan.resumeAt),
      state: breakSession?.endedAt
        ? "done"
        : status === "paused"
          ? "next"
          : "open",
    },
    {
      type: "end",
      time: formatTime(plan.endAt),
      state:
        status === "finished"
          ? "done"
          : status === "working" && hadBreak
            ? "next"
            : "open",
    },
  ]
  if (status === "finished") steps.forEach((step) => (step.state = "done"))

  const primary: ActionType | null =
    status === "none" || status === "cancelled"
      ? "start"
      : status === "working"
        ? hadBreak
          ? "end"
          : "pause"
        : status === "paused"
          ? "resume"
          : null
  const showStats = status === "working" || status === "paused"

  function adjust(step: ActionType) {
    return (at: string) =>
      window.adhdworker.adjustTime({ workdayId: day?.id, step, at })
  }

  function editorFor(step: ActionType, state: StepState, time: string) {
    if (!day) return null
    if (state === "done") {
      return <TimeEditor time={time} label="ändern" onSave={adjust(step)} />
    }
    if (step === "pause" && (status === "working" || status === "planned")) {
      return (
        <TimeEditor
          time={time}
          minutes={plan.pauseMinutes}
          label={`${plan.pauseMinutes} Min · ändern`}
          onSave={(at, minutes) =>
            window.adhdworker.setTodayPause({ at, minutes })
          }
        />
      )
    }
    if (step === "end" && status === "working" && overtime) {
      return (
        <button
          type="button"
          onClick={() => void window.adhdworker.unskipReminder("end")}
          className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300 hover:text-foreground"
        >
          <Bell className="size-3" /> Überstunden · doch erinnern
        </button>
      )
    }
    return null
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Heute</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">
            {headline}
          </h2>
          {status === "none" && isWeekday(now) ? (
            <p className="mt-2 text-muted-foreground">
              Ich erinnere dich um{" "}
              {formatTime(
                addMinutes(
                  todayAt(settings.startTime, now),
                  -settings.leadMinutes
                )
              )}{" "}
              ans Anmelden.
            </p>
          ) : null}
          {status === "working" && overtime ? (
            <p className="mt-2 text-muted-foreground">
              Keine Feierabend-Erinnerung mehr – melde dich selbst ab, wenn du
              fertig bist.
            </p>
          ) : null}
        </div>
        {showStats ? (
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Netto" value={formatDuration(plan.netMinutes)} />
            {extraMinutes > 0 ? (
              <Stat label="Mehr" value={`+${formatDuration(extraMinutes)}`} />
            ) : (
              <Stat
                label="Noch"
                value={formatDuration(plan.remainingMinutes)}
              />
            )}
            <Stat label="Feierabend" value={formatTime(plan.endAt)} highlight />
          </div>
        ) : null}
      </div>

      <ol className="mt-7 grid gap-2 sm:grid-cols-4">
        {steps.map((step) => (
          <li
            key={step.type}
            className={`rounded-2xl border p-3 ${
              step.state === "next"
                ? "border-primary/60 bg-primary/10"
                : step.state === "done"
                  ? "border-transparent bg-muted/60 text-muted-foreground"
                  : "border-border"
            }`}
          >
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
              {step.state === "done" ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : null}
              {ACTIONS[step.type].step}
            </p>
            <p className="mt-1 font-mono text-xl font-semibold">{step.time}</p>
            {editorFor(step.type, step.state, step.time)}
          </li>
        ))}
      </ol>

      {workday?.pendingAction && workday.pendingActionAt ? (
        <PendingBanner
          type={workday.pendingAction}
          at={workday.pendingActionAt}
          now={now}
        />
      ) : primary ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            size="lg"
            className="min-h-12 px-5 text-base"
            onClick={() => onAction(primary)}
          >
            {(() => {
              const Icon = ACTIONS[primary].icon
              return <Icon />
            })()}
            {ACTIONS[primary].button}
          </Button>
          {primary === "pause" ? (
            <Button
              size="lg"
              variant="outline"
              className="min-h-12"
              onClick={() => onAction("end")}
            >
              Ohne Pause Feierabend
            </Button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ${highlight ? "bg-primary/15" : "bg-muted"}`}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-xl font-semibold ${highlight ? "text-primary" : ""}`}
      >
        {value}
      </p>
    </div>
  )
}

function PendingBanner({
  type,
  at,
  now,
}: {
  type: ActionType
  at: string
  now: Date
}) {
  const [error, setError] = useState<string | null>(null)
  const seconds = Math.max(0, Math.round(minutesBetween(now, at) * 60))
  const countdown = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`

  async function run(kind: "now" | "cancel") {
    const result =
      kind === "now"
        ? await window.adhdworker.runPendingNow()
        : await window.adhdworker.cancelPending()
    setError(result.ok ? null : result.error)
  }

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-primary/50 bg-primary/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-sm">
        <Timer className="size-5 text-primary" />
        <span>
          Vorgemerkt:{" "}
          <strong>
            um {formatTime(at)} {ACTIONS[type].verb}
          </strong>{" "}
          – noch <span className="font-mono">{countdown}</span>. Das passiert
          automatisch, du musst nichts mehr tun.
        </span>
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => void run("now")}>
          Jetzt sofort
        </Button>
        <Button variant="ghost" onClick={() => void run("cancel")}>
          <X /> Abbrechen
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

/** Uhrzeit (und optional Dauer) direkt im Tagesplan ändern. */
function TimeEditor({
  time,
  minutes,
  label,
  onSave,
}: {
  time: string
  minutes?: number
  label: string
  onSave: (at: string, minutes: number) => Promise<ActionResponse>
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(time)
  const [length, setLength] = useState(minutes ?? 0)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const result = await onSave(value, length)
    if (result.ok) setOpen(false)
    setError(result.ok ? null : result.error)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(time)
          setLength(minutes ?? 0)
          setError(null)
          setOpen(true)
        }}
        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Pencil className="size-3" /> {label}
      </button>
    )
  }
  return (
    <div className="mt-2 space-y-2 text-xs">
      <div className="flex items-center gap-1">
        <input
          type="time"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-8 rounded-lg border border-input bg-background px-1 text-foreground"
          aria-label="Uhrzeit"
        />
        {minutes !== undefined ? (
          <>
            <input
              type="number"
              min={1}
              max={240}
              value={length}
              onChange={(event) => setLength(Number(event.target.value) || 1)}
              className="min-h-8 w-14 rounded-lg border border-input bg-background px-1 text-foreground"
              aria-label="Pausendauer in Minuten"
            />
            Min
          </>
        ) : null}
      </div>
      <div className="flex gap-1">
        <Button size="xs" onClick={() => void save()}>
          Speichern
        </Button>
        <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
      {error ? <p className="text-destructive">{error}</p> : null}
    </div>
  )
}

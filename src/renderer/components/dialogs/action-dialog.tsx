import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, BellOff, Clock3, Send } from "lucide-react"

import { computeDayPlan } from "../../../shared/day-plan"
import {
  formatDuration,
  formatTime,
  minutesBetween,
  shiftTime,
  todayAt,
} from "../../../shared/time"
import type { ActionType, DashboardData } from "../../../shared/types"
import { ACTIONS, useNow } from "../../lib/actions"
import { Button } from "../ui/button"
import { Dialog } from "../ui/dialog"

type ActionDialogProps = {
  type: ActionType
  data: DashboardData
  /** Erinnerung (vom Worker) oder manuell über einen Button geöffnet. */
  source: "reminder" | "manual"
  dueAt?: string
  onClose: () => void
}

const NOW = "now"

function unique(values: string[]) {
  return [...new Set(values)]
}

export function ActionDialog({
  type,
  data,
  source,
  dueAt,
  onClose,
}: ActionDialogProps) {
  const now = useNow()
  const copy = ACTIONS[type]
  const plan = computeDayPlan(now, data.settings, data.workday)

  // Schnellwahl: Standardzeiten + „Jetzt“. Der Tag darf von der Norm abweichen.
  const suggested = dueAt ? formatTime(dueAt) : null
  const chips = useMemo(() => {
    const base: Record<ActionType, string[]> = {
      start: [data.settings.startTime, shiftTime(data.settings.startTime, 15)],
      pause: [
        formatTime(plan.pauseAt),
        data.settings.pauseTime,
        shiftTime(data.settings.pauseTime, 30),
      ],
      resume: [formatTime(plan.resumeAt)],
      end: [formatTime(plan.endAt)],
    }
    return unique([...(suggested ? [suggested] : []), ...base[type]]).sort()
    // Bewusst nur bei Typwechsel neu: die Chips sollen beim Ticken nicht springen.
  }, [type, suggested])

  const [choice, setChoice] = useState(
    source === "reminder" && suggested ? suggested : NOW
  )
  const [pauseMinutes, setPauseMinutes] = useState(plan.pauseMinutes)
  const [sendTelegram, setSendTelegram] = useState(data.settings.telegramReady)
  const [sendNow, setSendNow] = useState(data.settings.sendImmediately[type])
  const [message, setMessage] = useState("")
  const [edited, setEdited] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const target = choice === NOW ? now : todayAt(choice, now)
  const overdueMinutes =
    choice === NOW ? 0 : Math.floor(minutesBetween(target, now))
  const isLater = choice !== NOW && overdueMinutes < 0
  const remainingAtTarget =
    type === "end"
      ? Math.max(
          0,
          plan.remainingMinutes - Math.max(0, minutesBetween(now, target))
        )
      : 0

  useEffect(() => {
    if (edited) return
    let active = true
    void window.adhdworker
      .previewMessage({ type, at: choice === NOW ? null : choice })
      .then((result) => {
        if (active) setMessage(result.text)
      })
    return () => {
      active = false
    }
  }, [type, choice, edited])

  async function submit() {
    setPending(true)
    setError(null)
    const result = await window.adhdworker.requestAction({
      type,
      at: isLater ? choice : null,
      message: sendTelegram ? (edited ? message : null) : "",
      ...(type === "pause" ? { pauseMinutes } : {}),
      sendNow: isLater && sendTelegram && sendNow,
    })
    setPending(false)
    if (result.ok) onClose()
    else setError(result.error)
  }

  async function later(kind: "snooze" | "skip") {
    if (kind === "snooze") await window.adhdworker.snoozeReminder(type)
    else await window.adhdworker.skipReminder(type)
    onClose()
  }

  const Icon = copy.icon
  const verb = copy.verb
  const primaryLabel = isLater ? `Um ${choice} ${verb}` : `Jetzt ${verb}`

  return (
    <Dialog
      eyebrow={source === "reminder" ? "Erinnerung" : "Jetzt melden"}
      title={copy.title}
      tone={overdueMinutes > 0 ? "alert" : "default"}
      description={
        !isLater
          ? "Die Meldung geht sofort raus."
          : sendTelegram && sendNow
            ? `Die Nachricht geht sofort raus, deine Zeit zählt ab ${choice}.`
            : `Bestätige jetzt – die Meldung geht automatisch genau um ${choice} raus.`
      }
      onClose={source === "manual" ? onClose : undefined}
    >
      <div className="space-y-5">
        {overdueMinutes > 0 ? (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>
                {choice} ist seit {overdueMinutes} Min vorbei.
              </strong>{" "}
              Klicke unten, dann wirst du jetzt sofort{" "}
              {verb.replace(" (Feierabend)", "")}.
            </p>
          </div>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Wann?</legend>
          <div className="flex flex-wrap items-center gap-2">
            {chips.map((time) => (
              <Chip
                key={time}
                active={choice === time}
                onClick={() => setChoice(time)}
              >
                {time}
              </Chip>
            ))}
            <Chip active={choice === NOW} onClick={() => setChoice(NOW)}>
              Jetzt
            </Chip>
            <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="size-4" /> andere Zeit
              <input
                type="time"
                value={choice === NOW ? "" : choice}
                onChange={(event) =>
                  event.target.value && setChoice(event.target.value)
                }
                className="min-h-10 rounded-xl border border-input bg-background px-2 text-foreground"
              />
            </label>
          </div>
        </fieldset>

        {type === "pause" ? (
          <label className="flex items-center gap-3 text-sm font-medium">
            Pausendauer heute
            <input
              type="number"
              min={1}
              max={240}
              value={pauseMinutes}
              onChange={(event) =>
                setPauseMinutes(Number(event.target.value) || 1)
              }
              className="min-h-10 w-20 rounded-xl border border-input bg-background px-2"
            />
            Min · wieder da um{" "}
            <strong>
              {formatTime(new Date(target.getTime() + pauseMinutes * 60_000))}
            </strong>
          </label>
        ) : null}

        {type === "end" && remainingAtTarget > 0 ? (
          <p className="rounded-2xl bg-amber-400/10 p-3 text-sm text-amber-300">
            Dann fehlen noch{" "}
            <strong>{formatDuration(remainingAtTarget)}</strong> bis zu deinen
            Soll-Stunden ({formatTime(plan.endAt)}).
          </p>
        ) : null}

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={sendTelegram}
              onChange={(event) => setSendTelegram(event.target.checked)}
              className="size-4 accent-primary"
            />
            Telegram-Nachricht senden
          </label>
          {sendTelegram && isLater ? (
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={sendNow}
                onChange={(event) => setSendNow(event.target.checked)}
                className="size-4 accent-primary"
              />
              Nachricht sofort senden (nicht erst um {choice})
            </label>
          ) : null}
          {!data.settings.telegramReady ? (
            <p className="text-xs text-amber-300">
              Telegram ist noch nicht eingerichtet (Einstellungen → Token und
              Chat-ID).
            </p>
          ) : null}
          {sendTelegram ? (
            <textarea
              value={message}
              onChange={(event) => {
                setMessage(event.target.value)
                setEdited(true)
              }}
              rows={5}
              className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-2xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {source === "reminder" ? (
              <>
                <Button variant="ghost" onClick={() => void later("snooze")}>
                  In 5 Min erinnern
                </Button>
                {type === "start" || type === "pause" ? (
                  <Button variant="ghost" onClick={() => void later("skip")}>
                    <BellOff />{" "}
                    {type === "start" ? "Heute frei" : "Heute keine Pause"}
                  </Button>
                ) : null}
              </>
            ) : (
              <Button variant="ghost" onClick={onClose}>
                Abbrechen
              </Button>
            )}
          </div>
          <Button
            size="lg"
            className="min-h-12 px-5 text-base"
            onClick={() => void submit()}
            disabled={pending}
          >
            {sendTelegram ? <Send /> : <Icon />} {primaryLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-10 rounded-xl border px-4 font-mono text-sm font-semibold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:border-primary/60"
      }`}
    >
      {children}
    </button>
  )
}

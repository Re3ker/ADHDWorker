import { useEffect, useRef, useState } from "react"

import type { SettingsData } from "../../../shared/types"

export type SettingsSaveState = "pending" | "saving" | "saved" | "error" | null

const inputClass =
  "min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal"

function minutesToTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number)
  return hours * 60 + minutes
}

/** Speichert automatisch kurz nach jeder Änderung. */
export function SettingsForm({
  initial,
  onSaveState,
}: {
  initial: SettingsData
  onSaveState: (state: SettingsSaveState) => void
}) {
  const [values, setValues] = useState(initial)
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const changed = useRef(false)

  function update<K extends keyof SettingsData>(
    key: K,
    value: SettingsData[K]
  ) {
    changed.current = true
    setValues((current) => ({ ...current, [key]: value }))
    onSaveState("pending")
  }

  useEffect(() => {
    if (!changed.current) return
    const timeout = window.setTimeout(async () => {
      onSaveState("saving")
      const result = await window.adhdworker.updateSettings({
        ...values,
        telegramBotToken: token,
      })
      if (result.ok) {
        setError(null)
        onSaveState("saved")
        if (token) {
          setToken("")
          setValues((current) => ({ ...current, hasTelegramBotToken: true }))
        }
      } else {
        setError(result.error)
        onSaveState("error")
      }
    }, 600)
    return () => window.clearTimeout(timeout)
  }, [values, token, onSaveState])

  return (
    <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
      <Section
        eyebrow="Tagesplan (Mo–Fr)"
        title="Wann soll ich dich erinnern?"
        description="Das sind Standardwerte. Start und Pause kannst du jeden Tag im Dialog anpassen – der Feierabend wird aus deinen Soll-Stunden berechnet."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Soll-Arbeitszeit (netto)"
            hint="Stunden:Minuten pro Tag"
          >
            <input
              type="time"
              value={minutesToTime(values.targetWorkMinutes)}
              onChange={(event) =>
                event.target.value &&
                update("targetWorkMinutes", timeToMinutes(event.target.value))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Anmelden um" hint="Standard-Arbeitsbeginn">
            <input
              type="time"
              value={values.startTime}
              onChange={(event) => update("startTime", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            label="Pause um"
            hint="Merkt sich die zuletzt gewählte Pausenzeit"
          >
            <input
              type="time"
              value={values.pauseTime}
              onChange={(event) => update("pauseTime", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Pausendauer" hint="Minuten">
            <input
              type="number"
              min={1}
              max={240}
              value={values.pauseMinutes}
              onChange={(event) =>
                update("pauseMinutes", Number(event.target.value))
              }
              className={inputClass}
            />
          </Field>
          <Field label="Erinnerung vorher" hint="Minuten vor jeder Uhrzeit">
            <input
              type="number"
              min={0}
              max={30}
              value={values.leadMinutes}
              onChange={(event) =>
                update("leadMinutes", Number(event.target.value))
              }
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        eyebrow="Telegram"
        title="Wohin gehen deine Meldungen?"
        description="Token und Chat-ID bleiben lokal auf diesem Rechner."
      >
        <div className="grid gap-5">
          <Field
            label="Bot-Token"
            hint={
              values.hasTelegramBotToken
                ? "Token ist hinterlegt. Leer lassen zum Beibehalten."
                : "Von @BotFather, z. B. 123456:ABC…"
            }
          >
            <input
              type="password"
              value={token}
              onChange={(event) => {
                changed.current = true
                setToken(event.target.value)
                onSaveState("pending")
              }}
              placeholder={
                values.hasTelegramBotToken ? "••••••••" : "123456:ABC…"
              }
              autoComplete="new-password"
              className={inputClass}
            />
          </Field>
          <Field label="Chat-ID" hint="z. B. -1001234567890">
            <input
              value={values.telegramChatId}
              onChange={(event) => update("telegramChatId", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        eyebrow="Versand"
        title="Wann geht die Nachricht raus?"
        description="Angehakt: Die Nachricht geht sofort beim Bestätigen raus. Sonst wartet sie auf die gewählte Uhrzeit. Die Zeit zählt in beiden Fällen ab der Uhrzeit."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={values.sendStartImmediately}
            onChange={(value) => update("sendStartImmediately", value)}
            title="Anmelden sofort senden"
            text="z. B. um 08:44 „Ich bin ab 09:00 da“."
          />
          <Toggle
            checked={values.sendPauseImmediately}
            onChange={(value) => update("sendPauseImmediately", value)}
            title="Zur Pause abmelden sofort senden"
            text="Sonst genau zur Pausenzeit."
          />
          <Toggle
            checked={values.sendResumeImmediately}
            onChange={(value) => update("sendResumeImmediately", value)}
            title="Wieder anmelden sofort senden"
            text="Sonst genau zum Pausenende."
          />
          <Toggle
            checked={values.sendEndImmediately}
            onChange={(value) => update("sendEndImmediately", value)}
            title="Feierabend sofort senden"
            text="Sonst genau zum Feierabend."
          />
        </div>
      </Section>

      <Section eyebrow="Desktop" title="Wie verhält sich die App?">
        <div className="space-y-3">
          <Toggle
            checked={values.launchAtLogin}
            onChange={(value) => update("launchAtLogin", value)}
            title="Mit Windows starten"
            text="Startet beim Anmelden an Windows unsichtbar im Infobereich, damit keine Erinnerung verloren geht."
          />
          <Toggle
            checked={values.minimizeOnClose}
            onChange={(value) => update("minimizeOnClose", value)}
            title="Beim Schließen in den Infobereich minimieren"
            text="Erinnerungen funktionieren nur, solange die App läuft."
          />
          <Toggle
            checked={values.desktopNotifications}
            onChange={(value) => update("desktopNotifications", value)}
            title="Bestätigungen als Windows-Hinweis"
            text="Zeigt nach jeder An- und Abmeldung kurz einen Hinweis. Erinnerungen und Fehler kommen immer."
          />
        </div>
      </Section>

      <Section
        eyebrow="Nachrichten"
        title="Was soll gesendet werden?"
        description={
          <>
            Platzhalter: <code>{"{date}"}</code>, <code>{"{startTime}"}</code>,{" "}
            <code>{"{endTime}"}</code>, <code>{"{tasks}"}</code>.
          </>
        }
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Template
            label="Anmelden"
            value={values.startMessageTemplate}
            onChange={(value) => update("startMessageTemplate", value)}
          />
          <Template
            label="Zur Pause abmelden"
            value={values.pauseMessageTemplate}
            onChange={(value) => update("pauseMessageTemplate", value)}
          />
          <Template
            label="Wieder anmelden"
            value={values.resumeMessageTemplate}
            onChange={(value) => update("resumeMessageTemplate", value)}
          />
          <Template
            label="Feierabend"
            value={values.endMessageTemplate}
            onChange={(value) => update("endMessageTemplate", value)}
          />
        </div>
      </Section>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Nicht gespeichert: {error}
        </div>
      ) : null}
    </form>
  )
}

function Section({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint ? (
        <span className="block text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  )
}

function Toggle({
  checked,
  onChange,
  title,
  text,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  title: string
  text: string
}) {
  return (
    <label className="settings-option flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <strong className="font-medium">{title}</strong>
        <span className="mt-1 block text-muted-foreground">{text}</span>
      </span>
    </label>
  )
}

function Template({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="space-y-2 text-sm font-medium">
      {label}
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-normal"
      />
    </label>
  )
}

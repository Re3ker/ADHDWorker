"use client"

import { useState, useTransition } from "react"

import { saveSettingsAction } from "@/app/actions"
import { Button } from "@/components/ui/button"

type SettingsData = {
  defaultStartTime: string
  telegramChatId: string
  hasTelegramBotToken: boolean
  timezone: string
  startMessageTemplate: string
  pauseMessageTemplate: string
  resumeMessageTemplate: string
  endMessageTemplate: string
}

export function SettingsForm({ initial }: { initial: SettingsData }) {
  const [values, setValues] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function update(key: keyof SettingsData, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = await saveSettingsAction(form)
      if (result.ok) setSaved(true)
      else setError(result.error || "Einstellungen konnten nicht gespeichert werden.")
    })
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Arbeitsablauf</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Einmal einrichten, dann loslegen</h2>
        <p className="mt-2 text-sm text-muted-foreground">Diese Werte werden im Startdialog vorausgefüllt.</p>
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium">
            Standard-Startzeit
            <input name="defaultStartTime" type="time" value={values.defaultStartTime} onChange={(event) => update("defaultStartTime", event.target.value)} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" required />
          </label>
          <label className="space-y-2 text-sm font-medium">
            Zeitzone
            <input name="timezone" value={values.timezone} onChange={(event) => update("timezone", event.target.value)} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" required />
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Telegram-Bot-Token
            <input name="telegramBotToken" type="password" defaultValue="" placeholder={values.hasTelegramBotToken ? "Token ist hinterlegt — leer lassen zum Beibehalten" : "123456:ABC..."} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" autoComplete="new-password" />
            <span className="block text-xs font-normal text-muted-foreground">Der Token wird in der Datenbank gespeichert und nie an den Browser zurückgegeben.</span>
          </label>
          <label className="space-y-2 text-sm font-medium sm:col-span-2">
            Telegram-Chat-ID
            <input name="telegramChatId" value={values.telegramChatId} onChange={(event) => update("telegramChatId", event.target.value)} placeholder="z. B. -1001234567890" className="min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
            <span className="block text-xs font-normal text-muted-foreground">Wird ebenfalls in der Datenbank gespeichert.</span>
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="text-sm font-medium text-primary">Telegram-Vorlagen</p>
        <h2 className="mt-1 text-xl font-semibold">Was soll gesendet werden?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Verfügbare Variablen: <code>{"{date}"}</code>, <code>{"{startTime}"}</code>, <code>{"{endTime}"}</code>, <code>{"{tasks}"}</code>.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <TemplateField name="startMessageTemplate" label="Start" value={values.startMessageTemplate} onChange={(value) => update("startMessageTemplate", value)} />
          <TemplateField name="pauseMessageTemplate" label="Pause" value={values.pauseMessageTemplate} onChange={(value) => update("pauseMessageTemplate", value)} />
          <TemplateField name="resumeMessageTemplate" label="Fortsetzen" value={values.resumeMessageTemplate} onChange={(value) => update("resumeMessageTemplate", value)} />
          <TemplateField name="endMessageTemplate" label="Ende" value={values.endMessageTemplate} onChange={(value) => update("endMessageTemplate", value)} />
        </div>
      </section>

      {error ? <div role="alert" className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{error}</div> : null}
      {saved ? <div role="status" className="rounded-2xl border border-primary/50 bg-primary/10 p-4 text-sm text-primary">Gespeichert. Die neuen Werte werden beim nächsten Arbeitstag verwendet.</div> : null}
      <div className="flex justify-end"><Button type="submit" size="lg" disabled={isPending}>{isPending ? "Speichert …" : "Einstellungen speichern"}</Button></div>
    </form>
  )
}

function TemplateField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-2 text-sm font-medium">{label}<textarea name={name} value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" required /></label>
}

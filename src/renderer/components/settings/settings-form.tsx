import { useEffect, useRef, useState } from "react"
import type { SettingsData } from "../../../shared/types"

export type SettingsSaveState = "pending" | "saving" | "saved" | "error" | null

export function SettingsForm({ initial, onSaveState }: { initial: SettingsData; onSaveState?: (state: SettingsSaveState) => void }) {
  const [values, setValues] = useState(initial)
  const [token, setToken] = useState("")
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    window.adhdworker.setMinimizeOnClose(values.minimizeOnClose)
  }, [values.minimizeOnClose])

  function update(key: keyof SettingsData, value: string | boolean) {
    setValues((current) => ({ ...current, [key]: value }))
    onSaveState?.("pending")
  }

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return }
    setError(null)
    const timeout = window.setTimeout(async () => {
      onSaveState?.("saving")
      const result = await window.adhdworker.updateSettings({ ...values, telegramBotToken: token })
      if (result.ok) { window.adhdworker.setMinimizeOnClose(values.minimizeOnClose); onSaveState?.("saved"); if (token) setToken("") }
      else { setError(result.error || "Einstellungen konnten nicht gespeichert werden."); onSaveState?.("error") }
    }, 650)
    return () => window.clearTimeout(timeout)
  }, [token, values])

  return (
    <form onSubmit={(event) => event.preventDefault()} className="space-y-6">
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
            <input name="telegramBotToken" type="password" value={token} onChange={(event) => { setToken(event.target.value); onSaveState?.("pending") }} placeholder={values.hasTelegramBotToken ? "Token ist hinterlegt — leer lassen zum Beibehalten" : "123456:ABC..."} className="min-h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" autoComplete="new-password" />
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
        <p className="text-sm font-medium text-primary">Desktop-App</p>
        <h2 className="mt-1 text-xl font-semibold">Was passiert beim Schließen?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Geplante Arbeitstage und Telegram-Versand laufen im Infobereich weiter.</p>
        <div className="mt-6 space-y-4">
          <label className="settings-option flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm">
            <input name="minimizeOnClose" type="checkbox" checked={values.minimizeOnClose} onChange={(event) => update("minimizeOnClose", event.target.checked)} className="mt-0.5 size-4 accent-primary" />
            <span><strong className="font-medium">Beim Schließen in den Infobereich minimieren</strong><span className="mt-1 block text-muted-foreground">Deaktiviere dies, wenn das Fenster die App vollständig beenden soll.</span></span>
          </label>
          <label className="settings-option flex items-start gap-3 rounded-2xl bg-muted p-4 text-sm">
            <input name="desktopNotifications" type="checkbox" checked={values.desktopNotifications} onChange={(event) => update("desktopNotifications", event.target.checked)} className="mt-0.5 size-4 accent-primary" />
            <span><strong className="font-medium">Lokale Status-Hinweise anzeigen</strong><span className="mt-1 block text-muted-foreground">Hinweise erscheinen bei Start, Pause, Fortsetzen, Ende und Telegram-Fehlern.</span></span>
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

      {error ? <div role="alert" className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">{error} Ändere den Wert und wir versuchen es erneut.</div> : null}
    </form>
  )
}

function TemplateField({ name, label, value, onChange }: { name: string; label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-2 text-sm font-medium">{label}<textarea name={name} value={value} onChange={(event) => onChange(event.target.value)} rows={5} className="w-full resize-y rounded-xl border border-input bg-background px-3 py-2 font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/50" required /></label>
}

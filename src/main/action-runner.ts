import { deliverTelegramMessage } from "./telegram"
import { getSettings } from "./settings-service"
import { emitChanged, notify, sendToRenderer, showWindow } from "./window"
import type { ExecutedAction } from "./workday-service"

const DONE_TEXT = {
  start: "Du bist angemeldet. Viel Erfolg!",
  pause: "Du bist zur Pause abgemeldet.",
  resume: "Du bist wieder angemeldet.",
  end: "Feierabend! Deine Zeiten sind bereit zum Kopieren.",
} as const

/** Telegram sofort senden. Fehler sind laut, weil eine verlorene Meldung zählt. */
export async function sendTelegram(messageId: string) {
  const message = await deliverTelegramMessage(messageId)
  if (message?.status === "failed") {
    notify(
      "Telegram-Meldung fehlgeschlagen",
      `${message.errorMessage ?? "Unbekannter Fehler."} Öffne ADHDWorker und tippe auf „Erneut senden“.`
    )
  }
  return message
}

/** Nach jeder ausgeführten An-/Abmeldung (sofort oder vom Worker). */
export async function afterAction(action: ExecutedAction) {
  if (action.messageId) await sendTelegram(action.messageId)
  const settings = await getSettings()
  if (settings.desktopNotifications)
    notify("ADHDWorker", DONE_TEXT[action.type])
  if (action.type === "end") {
    showWindow()
    sendToRenderer("app:day-finished", action.workdayId)
  }
  emitChanged()
}

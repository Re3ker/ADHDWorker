import "dotenv/config"

import { deliverTelegramMessage } from "@/lib/telegram"
import { getDueMessages, getDuePlannedWorkdays, startScheduledWorkday } from "@/lib/workday-service"

async function processDueWorkdays() {
  const workdays = await getDuePlannedWorkdays()
  for (const workday of workdays) await startScheduledWorkday(workday.id)
  if (workdays.length > 0) console.log(`Worker: ${workdays.length} Arbeitstag/Arbeitstage gestartet.`)
}

async function processDueMessages() {
  const messages = await getDueMessages()
  for (const message of messages) {
    await deliverTelegramMessage(message.id)
  }
  if (messages.length > 0) console.log(`Worker: ${messages.length} Nachricht(en) verarbeitet.`)
}

async function processDue() {
  await processDueWorkdays()
  await processDueMessages()
}

async function main() {
  console.log("Telegram-Worker läuft. Prüfung alle 10 Sekunden.")
  await processDue()
  setInterval(() => {
    processDue().catch((error) => console.error("Worker-Fehler:", error))
  }, 10_000)
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

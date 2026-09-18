import { deliverTelegramMessage } from "./telegram"
import { getDueMessages, getDuePlannedWorkdays, startScheduledWorkday } from "./workday-service"

let timer: NodeJS.Timeout | null = null

async function tick(onChanged: () => void) {
  try {
    const planned = await getDuePlannedWorkdays()
    let changed = false
    for (const workday of planned) {
      changed = Boolean(await startScheduledWorkday(workday.id)) || changed
    }

    const messages = await getDueMessages()
    for (const message of messages) {
      await deliverTelegramMessage(message.id)
      changed = true
    }

    if (changed) onChanged()
  } catch (error) {
    console.error("ADHDWorker-Worker fehlgeschlagen:", error)
  }
}

export function startWorker(onChanged: () => void) {
  void tick(onChanged)
  timer = setInterval(() => void tick(onChanged), 10_000)
}

export function stopWorker() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

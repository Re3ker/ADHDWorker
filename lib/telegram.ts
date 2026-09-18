import { db } from "@/lib/db"

type TelegramResponse = { ok: boolean; description?: string }

export async function sendTelegramMessage(token: string, chatId: string, text: string) {
  if (!token) throw new Error("Kein Telegram-Bot-Token in den Einstellungen hinterlegt.")
  if (!chatId) throw new Error("Keine Telegram-Chat-ID konfiguriert.")

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: "no-store",
  })
  const data = (await response.json()) as TelegramResponse
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram antwortete mit ${response.status}.`)
  return data
}

export async function deliverTelegramMessage(messageId: string) {
  const now = new Date()
  const stale = new Date(Date.now() - 5 * 60 * 1000)
  const claim = await db.telegramMessage.updateMany({
    where: {
      id: messageId,
      status: "pending",
      OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
    },
    data: { lockedAt: now },
  })
  if (claim.count === 0) return db.telegramMessage.findUnique({ where: { id: messageId } })

  const message = await db.telegramMessage.findUnique({ where: { id: messageId }, include: { workday: true } })
  if (!message) return null

  try {
    const settings = await db.settings.findUnique({ where: { id: 1 } })
    await sendTelegramMessage(settings?.telegramBotToken ?? "", settings?.telegramChatId ?? "", message.content)
    return db.telegramMessage.update({
      where: { id: message.id },
      data: { status: "sent", sentAt: new Date(), lockedAt: null, errorMessage: null },
    })
  } catch (error) {
    return db.telegramMessage.update({
      where: { id: message.id },
      data: {
        status: "failed",
        lockedAt: null,
        errorMessage: error instanceof Error ? error.message : "Unbekannter Telegram-Fehler.",
      },
    })
  }
}

export async function retryTelegramMessage(messageId: string) {
  await db.telegramMessage.update({ where: { id: messageId }, data: { status: "pending", errorMessage: null, lockedAt: null } })
  return deliverTelegramMessage(messageId)
}

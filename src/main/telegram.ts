import { getDb } from "./db"

type TelegramResponse = { ok: boolean; description?: string }

async function sendTelegramMessage(
  token: string,
  chatId: string,
  text: string
) {
  if (!token)
    throw new Error(
      "Hinterlege in den Einstellungen deinen Telegram-Bot-Token."
    )
  if (!chatId)
    throw new Error("Hinterlege in den Einstellungen deine Telegram-Chat-ID.")
  let response: Response
  try {
    response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    throw new Error(
      "Telegram ist nicht erreichbar. Prüfe deine Internetverbindung."
    )
  }
  const data = (await response
    .json()
    .catch(() => ({ ok: false }))) as TelegramResponse
  if (!response.ok || !data.ok) {
    throw new Error(
      data.description || `Telegram antwortete mit ${response.status}.`
    )
  }
}

export async function deliverTelegramMessage(messageId: string) {
  const db = getDb()
  const stale = new Date(Date.now() - 5 * 60 * 1000)
  // Nachricht sperren, damit Worker und Klick sie nicht doppelt senden.
  const claim = await db.telegramMessage.updateMany({
    where: {
      id: messageId,
      status: "pending",
      OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }],
    },
    data: { lockedAt: new Date() },
  })
  const message = await db.telegramMessage.findUnique({
    where: { id: messageId },
  })
  if (claim.count === 0 || !message) return message

  try {
    const settings = await db.settings.findUnique({ where: { id: 1 } })
    await sendTelegramMessage(
      settings?.telegramBotToken ?? "",
      settings?.telegramChatId ?? "",
      message.content
    )
    return db.telegramMessage.update({
      where: { id: message.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        lockedAt: null,
        errorMessage: null,
      },
    })
  } catch (error) {
    return db.telegramMessage.update({
      where: { id: message.id },
      data: {
        status: "failed",
        lockedAt: null,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unbekannter Telegram-Fehler.",
      },
    })
  }
}

export async function resetTelegramMessage(messageId: string) {
  await getDb().telegramMessage.update({
    where: { id: messageId },
    data: { status: "pending", errorMessage: null, lockedAt: null },
  })
}

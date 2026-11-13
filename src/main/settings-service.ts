import type { Prisma, PrismaClient, Settings } from "@prisma/client"

import { getDb } from "./db"
import { DEFAULT_TEMPLATES } from "../shared/message-templates"
import { settingsSchema } from "../shared/schemas"
import type { SettingsData } from "../shared/types"

function envValue(name: string) {
  return process.env[name]?.trim() || ""
}

export async function getSettings(
  db: Prisma.TransactionClient | PrismaClient = getDb()
): Promise<Settings> {
  const existing = await db.settings.findUnique({ where: { id: 1 } })
  if (existing) {
    // Token/Chat-ID einmalig aus .env übernehmen, falls noch leer.
    const bootstrap = {
      ...(!existing.telegramBotToken && envValue("TELEGRAM_BOT_TOKEN")
        ? { telegramBotToken: envValue("TELEGRAM_BOT_TOKEN") }
        : {}),
      ...(!existing.telegramChatId && envValue("TELEGRAM_CHAT_ID")
        ? { telegramChatId: envValue("TELEGRAM_CHAT_ID") }
        : {}),
    }
    return Object.keys(bootstrap).length > 0
      ? db.settings.update({ where: { id: 1 }, data: bootstrap })
      : existing
  }
  return db.settings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      telegramChatId: envValue("TELEGRAM_CHAT_ID"),
      telegramBotToken: envValue("TELEGRAM_BOT_TOKEN"),
      startMessageTemplate: DEFAULT_TEMPLATES.start,
      pauseMessageTemplate: DEFAULT_TEMPLATES.pause,
      resumeMessageTemplate: DEFAULT_TEMPLATES.resume,
      endMessageTemplate: DEFAULT_TEMPLATES.end,
    },
  })
}

export async function updateSettings(input: unknown) {
  const { telegramBotToken, ...settings } = settingsSchema.parse(input)
  await getSettings()
  return getDb().settings.update({
    where: { id: 1 },
    // Leeres Token-Feld bedeutet „bisherigen Token behalten“.
    data: { ...settings, ...(telegramBotToken ? { telegramBotToken } : {}) },
  })
}

export function serializeSettings(settings: Settings): SettingsData {
  return {
    startTime: settings.startTime,
    pauseTime: settings.pauseTime,
    pauseMinutes: settings.pauseMinutes,
    targetWorkMinutes: settings.targetWorkMinutes,
    leadMinutes: settings.leadMinutes,
    launchAtLogin: settings.launchAtLogin,
    sendStartImmediately: settings.sendStartImmediately,
    sendPauseImmediately: settings.sendPauseImmediately,
    sendResumeImmediately: settings.sendResumeImmediately,
    sendEndImmediately: settings.sendEndImmediately,
    minimizeOnClose: settings.minimizeOnClose,
    desktopNotifications: settings.desktopNotifications,
    telegramChatId: settings.telegramChatId,
    hasTelegramBotToken: Boolean(settings.telegramBotToken),
    startMessageTemplate: settings.startMessageTemplate,
    pauseMessageTemplate: settings.pauseMessageTemplate,
    resumeMessageTemplate: settings.resumeMessageTemplate,
    endMessageTemplate: settings.endMessageTemplate,
  }
}

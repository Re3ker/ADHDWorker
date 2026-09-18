import { z } from "zod"

export const taskSchema = z.object({
  workSessionId: z.string().min(1),
  content: z.string().trim().min(1, "Bitte beschreibe die Aufgabe.").max(500),
})

export const updateTaskSchema = z.object({
  taskId: z.string().min(1),
  content: z.string().trim().min(1, "Bitte beschreibe die Aufgabe.").max(500),
})

export const settingsSchema = z.object({
  defaultStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ungültige Uhrzeit."),
  telegramChatId: z.string().trim().max(100),
  telegramBotToken: z.string().trim().max(1000),
  minimizeOnClose: z.coerce.boolean(),
  desktopNotifications: z.coerce.boolean(),
  timezone: z.string().min(1).max(100),
  startMessageTemplate: z.string().trim().min(1).max(4000),
  pauseMessageTemplate: z.string().trim().min(1).max(4000),
  resumeMessageTemplate: z.string().trim().min(1).max(4000),
  endMessageTemplate: z.string().trim().min(1).max(4000),
})

export const startWorkdaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
})

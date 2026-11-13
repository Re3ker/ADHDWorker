import { z } from "zod"

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Bitte eine Uhrzeit wie 08:45 eingeben.")

export const actionTypeSchema = z.enum(["start", "pause", "resume", "end"])

/**
 * at: Ziel-Uhrzeit heute oder null für „jetzt“.
 * message: null = Vorlage beim Ausführen rendern, "" = keine Nachricht,
 * sonst eigener Text.
 */
export const requestActionSchema = z.object({
  type: actionTypeSchema,
  at: time.nullable(),
  message: z.string().max(4000).nullable(),
  pauseMinutes: z.number().int().min(1).max(240).optional(),
  /** Nachricht sofort senden, Zustandswechsel trotzdem erst zur Uhrzeit. */
  sendNow: z.boolean().optional(),
})

export const previewSchema = z.object({
  type: actionTypeSchema,
  at: time.nullable(),
})

export const todayPauseSchema = z.object({
  at: time,
  minutes: z.number().int().min(1).max(240),
})

export const taskSchema = z.object({
  content: z.string().trim().min(1, "Bitte beschreibe die Aufgabe.").max(500),
})

export const updateTaskSchema = taskSchema.extend({ taskId: z.string().min(1) })
export const idSchema = z.string().min(1).max(100)

export const settingsSchema = z.object({
  startTime: time,
  pauseTime: time,
  pauseMinutes: z.number().int().min(1).max(240),
  targetWorkMinutes: z.number().int().min(30).max(720),
  leadMinutes: z.number().int().min(0).max(30),
  launchAtLogin: z.boolean(),
  sendStartImmediately: z.boolean(),
  sendPauseImmediately: z.boolean(),
  sendResumeImmediately: z.boolean(),
  sendEndImmediately: z.boolean(),
  minimizeOnClose: z.boolean(),
  desktopNotifications: z.boolean(),
  telegramChatId: z.string().trim().max(100),
  telegramBotToken: z.string().trim().max(1000),
  startMessageTemplate: z.string().trim().min(1).max(4000),
  pauseMessageTemplate: z.string().trim().min(1).max(4000),
  resumeMessageTemplate: z.string().trim().min(1).max(4000),
  endMessageTemplate: z.string().trim().min(1).max(4000),
})

export type ActionType = z.infer<typeof actionTypeSchema>
export type RequestActionInput = z.infer<typeof requestActionSchema>
export type PreviewInput = z.infer<typeof previewSchema>
export type TodayPauseInput = z.infer<typeof todayPauseSchema>
export type SettingsInput = z.infer<typeof settingsSchema>

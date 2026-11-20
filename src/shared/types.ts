import type { ActionType } from "./schemas"
import type { PlanSettings } from "./day-plan"

export type { ActionType, PlanSettings }
export type WorkdayStatus =
  "planned" | "working" | "paused" | "finished" | "cancelled"
export type MessageStatus = "pending" | "sent" | "failed" | "cancelled"

export type TaskData = { id: string; content: string; part: number }

export type SessionData = {
  id: string
  type: "work" | "break"
  startedAt: string
  endedAt: string | null
}

export type MessageData = {
  id: string
  type: ActionType
  status: MessageStatus
  content: string
  errorMessage: string | null
  sentAt: string | null
}

export type WorkdayData = {
  id: string
  status: WorkdayStatus
  scheduledStartAt: string | null
  actualStartAt: string | null
  endedAt: string | null
  plannedPauseAt: string | null
  pauseMinutes: number | null
  pendingAction: ActionType | null
  pendingActionAt: string | null
  sessions: SessionData[]
  tasks: TaskData[]
  messages: MessageData[]
}

export type SettingsData = PlanSettings & {
  launchAtLogin: boolean
  sendStartImmediately: boolean
  sendPauseImmediately: boolean
  sendResumeImmediately: boolean
  sendEndImmediately: boolean
  minimizeOnClose: boolean
  desktopNotifications: boolean
  telegramChatId: string
  hasTelegramBotToken: boolean
  startMessageTemplate: string
  pauseMessageTemplate: string
  resumeMessageTemplate: string
  endMessageTemplate: string
}

export type ReminderData = { type: ActionType; dueAt: string }

export type DashboardData = {
  workday: WorkdayData | null
  finishedToday: WorkdayData | null
  settings: PlanSettings & {
    telegramReady: boolean
    sendImmediately: Record<ActionType, boolean>
  }
  reminder: ReminderData | null
  /** Heute abgeschaltete Erinnerungen („end“ = Überstunden). */
  skippedReminders: ActionType[]
}

/**
 * available = nur Hinweis (portable EXE), downloading = lädt im Hintergrund,
 * ready = installiert sich beim Beenden oder per „Jetzt neu starten“.
 */
export type UpdateInfo = {
  version: string
  releaseUrl: string
  state: "available" | "downloading" | "ready"
}

export type ActionResponse = { ok: true } | { ok: false; error: string }

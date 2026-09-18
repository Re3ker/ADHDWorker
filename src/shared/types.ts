export type WorkdayStatus = "planned" | "working" | "paused" | "finished" | "cancelled"
export type SessionType = "work" | "break"
export type TelegramMessageType = "start" | "pause" | "resume" | "end"
export type TelegramMessageStatus = "pending" | "sent" | "failed" | "cancelled"

export type SessionData = {
  id: string
  type: SessionType
  startedAt: string
  endedAt: string | null
  tasks: Array<{ id: string; content: string }>
}

export type MessageData = {
  id: string
  type: TelegramMessageType
  status: TelegramMessageStatus
  content: string
  errorMessage: string | null
}

export type WorkdayData = {
  id: string
  status: WorkdayStatus
  scheduledStartAt: string | null
  actualStartAt: string | null
  endedAt: string | null
  sessions: SessionData[]
  messages: MessageData[]
}

export type SettingsData = {
  defaultStartTime: string
  telegramChatId: string
  hasTelegramBotToken: boolean
  timezone: string
  minimizeOnClose: boolean
  desktopNotifications: boolean
  startMessageTemplate: string
  pauseMessageTemplate: string
  resumeMessageTemplate: string
  endMessageTemplate: string
}

export type DashboardData = {
  workday: WorkdayData | null
  settings: Pick<SettingsData, "defaultStartTime" | "timezone" | "desktopNotifications">
  defaultDate: string
  defaultTime: string
}

export type HistoryDay = {
  id: string
  endedAt: string | null
  actualStartAt: string | null
  sessions: SessionData[]
  messages: Array<Pick<MessageData, "id" | "type" | "status" | "errorMessage">>
}

export type ActionResponse = { ok: true; messageId?: string } | { ok: false; error: string }

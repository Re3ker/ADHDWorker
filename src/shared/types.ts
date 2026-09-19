export type WorkdayStatus = "planned" | "working" | "paused" | "finished" | "cancelled"
export type SessionType = "work" | "break"
export type TelegramMessageType = "start" | "pause" | "resume" | "end"
export type TelegramMessageStatus = "pending" | "sent" | "failed" | "cancelled"

export type SessionData = {
  id: string
  type: SessionType
  startedAt: string
  endedAt: string | null
  tasks: Array<{ id: string; content: string; workspaceId: string | null; workspaceName: string | null; projectId: string | null; projectName: string | null; startedAt: string | null; endedAt: string | null }>
}

export type ClockifyOption = { id: string; name: string }
export type ClockifySyncData = { id: string; description: string; workspaceId: string; projectId: string; startedAt: string; endedAt: string; status: "pending" | "synced" | "failed"; errorMessage: string | null }

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
  clockifySyncEntries: ClockifySyncData[]
}

export type SettingsData = {
  defaultStartTime: string
  telegramChatId: string
  hasTelegramBotToken: boolean
  hasClockifyApiKey: boolean
  lastClockifyWorkspaceId: string | null
  lastClockifyProjectId: string | null
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
  settings: Pick<SettingsData, "defaultStartTime" | "timezone" | "desktopNotifications" | "hasClockifyApiKey" | "lastClockifyWorkspaceId" | "lastClockifyProjectId">
  defaultDate: string
  defaultTime: string
}

export type HistoryDay = {
  id: string
  endedAt: string | null
  actualStartAt: string | null
  sessions: SessionData[]
  messages: Array<Pick<MessageData, "id" | "type" | "status" | "errorMessage">>
  clockifySyncEntries: ClockifySyncData[]
}

export type ActionResponse = { ok: true; messageId?: string } | { ok: false; error: string }

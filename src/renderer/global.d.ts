import type { DashboardData, HistoryDay, SettingsData, ActionResponse } from "../shared/types"
import type { StartWorkdayInput, TaskInput, UpdateTaskInput } from "../shared/ipc"

declare global {
  interface Window {
    adhdworker: {
      getDashboard(): Promise<DashboardData>
      getHistory(): Promise<HistoryDay[]>
      getSettings(): Promise<SettingsData>
      getUpdate(): Promise<{ version: string; releaseUrl: string } | null>
      openReleasePage(): void
      planWorkday(input: StartWorkdayInput): Promise<ActionResponse>
      cancelWorkday(): Promise<ActionResponse>
      pauseWorkday(): Promise<ActionResponse>
      resumeWorkday(): Promise<ActionResponse>
      finishWorkday(): Promise<ActionResponse>
      createTask(input: TaskInput): Promise<ActionResponse>
      updateTask(input: UpdateTaskInput): Promise<ActionResponse>
      deleteTask(taskId: string): Promise<ActionResponse>
      updateSettings(input: SettingsData & { telegramBotToken: string }): Promise<ActionResponse>
      retryTelegram(messageId: string): Promise<ActionResponse>
      setMinimizeOnClose(value: boolean): void
      notify(payload: { title: string; body: string }): void
      onChanged(callback: () => void): () => void
      onUpdateAvailable(callback: (update: { version: string; releaseUrl: string }) => void): () => void
      getWindowState(): Promise<{ isMaximized: boolean }>
      minimizeWindow(): void
      toggleMaximizeWindow(): void
      closeWindow(): void
      onWindowState(callback: (state: { isMaximized: boolean }) => void): () => void
    }
  }
}

export {}

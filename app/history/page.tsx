import { AppShell } from "@/components/app-shell"
import { HistoryView, type HistoryDay } from "@/components/history/history-view"
import { getFinishedWorkdays } from "@/lib/workday-service"

export const dynamic = "force-dynamic"

export default async function HistoryPage() {
  const workdays = await getFinishedWorkdays()
  const days: HistoryDay[] = workdays.map((workday) => ({
    id: workday.id,
    endedAt: workday.endedAt?.toISOString() ?? null,
    actualStartAt: workday.actualStartAt?.toISOString() ?? null,
    sessions: workday.sessions.map((session) => ({
      id: session.id,
      type: session.type,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      tasks: session.tasks.map((task) => ({ id: task.id, content: task.content })),
    })),
    messages: workday.telegramMessages.map((message) => ({
      id: message.id,
      type: message.type,
      status: message.status,
      errorMessage: message.errorMessage,
    })),
  }))

  return <AppShell backToDashboard pageTitle="Verlauf"><div className="mt-8"><HistoryView days={days} /></div></AppShell>
}

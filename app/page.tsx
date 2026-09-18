import { AppShell } from "@/components/app-shell"
import { WorkDashboard, type DashboardData } from "@/components/dashboard/work-dashboard"
import { localDateInputValue, localTimeInputValue } from "@/lib/time"
import { getCurrentWorkday, getSettings } from "@/lib/workday-service"

export const dynamic = "force-dynamic"

function serializeWorkday(workday: Awaited<ReturnType<typeof getCurrentWorkday>>) {
  if (!workday) return null
  return {
    id: workday.id,
    status: workday.status,
    scheduledStartAt: workday.scheduledStartAt?.toISOString() ?? null,
    actualStartAt: workday.actualStartAt?.toISOString() ?? null,
    endedAt: workday.endedAt?.toISOString() ?? null,
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
      content: message.content,
      errorMessage: message.errorMessage,
    })),
  } as const
}

export default async function Page() {
  const [workday, settings] = await Promise.all([getCurrentWorkday(), getSettings()])
  const data: DashboardData = {
    workday: serializeWorkday(workday),
    settings: {
      defaultStartTime: settings.defaultStartTime,
      timezone: settings.timezone,
    },
    defaultDate: localDateInputValue(),
    defaultTime: localTimeInputValue(),
  }

  return <AppShell><div className="mt-8"><WorkDashboard initial={data} /></div></AppShell>
}

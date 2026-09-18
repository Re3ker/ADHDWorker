import { AppShell } from "@/components/app-shell"
import { SettingsForm } from "@/components/settings/settings-form"
import { getSettings } from "@/lib/workday-service"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const settings = await getSettings()

  return <AppShell backToDashboard pageTitle="Einstellungen"><div className="mt-8"><SettingsForm initial={{ defaultStartTime: settings.defaultStartTime, telegramChatId: settings.telegramChatId, hasTelegramBotToken: Boolean(settings.telegramBotToken), timezone: settings.timezone, startMessageTemplate: settings.startMessageTemplate, pauseMessageTemplate: settings.pauseMessageTemplate, resumeMessageTemplate: settings.resumeMessageTemplate, endMessageTemplate: settings.endMessageTemplate }} /></div></AppShell>
}

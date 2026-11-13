export const DEFAULT_TEMPLATES = {
  start: "Guten Morgen, ich bin ab {startTime} da.",
  pause: "Mache jetzt Pause.\n\nErledigt:\n{tasks}",
  resume: "Bin wieder da.",
  end: "Für heute fertig.\n\nErledigt:\n{tasks}",
} as const

export type MessageTemplateValues = {
  date?: string
  startTime?: string
  endTime?: string
  tasks?: string
}

export function renderMessageTemplate(
  template: string,
  values: MessageTemplateValues
) {
  return template.replace(
    /\{(date|startTime|endTime|tasks)\}/g,
    (_, key: keyof MessageTemplateValues) => values[key] ?? ""
  )
}

export function tasksForMessage(tasks: Array<{ content: string }>) {
  return tasks.length > 0
    ? tasks.map((task) => `• ${task.content}`).join("\n")
    : "Noch keine Aufgaben."
}

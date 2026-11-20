import { useState } from "react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"

import { partLabel } from "../../../shared/day-export"
import type { TaskData, WorkdayData } from "../../../shared/types"
import { Button } from "../ui/button"

/**
 * Aufgaben pro Abschnitt. „Vor der Pause“ und „Nach der Pause“ sind immer
 * sichtbar und jederzeit ergänzbar – auch nachträglich oder vorab.
 */
export function TaskPanel({ workday }: { workday: WorkdayData }) {
  const workCount = workday.sessions.filter((s) => s.type === "work").length
  const highestTaskPart = Math.max(-1, ...workday.tasks.map((t) => t.part))
  const partCount = Math.max(2, workCount, highestTaskPart + 1)
  const current = workday.status === "working" ? workCount - 1 : -1

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
      <h2 className="text-lg font-semibold">Was hast du erledigt?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Jederzeit ergänzbar. Wird automatisch gespeichert und bei Pause und
        Feierabend mitgeschickt.
      </p>
      <div className="mt-5 space-y-4">
        {Array.from({ length: partCount }, (_, part) => (
          <TaskSection
            key={part}
            workdayId={workday.id}
            part={part}
            isCurrent={part === current}
            tasks={workday.tasks.filter((task) => task.part === part)}
          />
        ))}
      </div>
    </section>
  )
}

function TaskSection({
  workdayId,
  part,
  isCurrent,
  tasks,
}: {
  workdayId: string
  part: number
  isCurrent: boolean
  tasks: TaskData[]
}) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState("")

  async function run(result: Promise<{ ok: boolean; error?: string }>) {
    const response = await result
    setError(response.ok ? null : (response.error ?? "Nicht gespeichert."))
    return response.ok
  }

  async function add(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    const saved = await run(
      window.adhdworker.createTask({ workdayId, part, content: text })
    )
    if (saved) setText("")
  }

  async function saveEdit(taskId: string) {
    const saved = await run(
      window.adhdworker.updateTask({ taskId, content: editText })
    )
    if (saved) setEditing(null)
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isCurrent ? "border-primary/50 bg-primary/5" : "border-border"
      }`}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        {partLabel(part)}
        {isCurrent ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
            läuft gerade
          </span>
        ) : null}
      </p>

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Noch keine Aufgaben.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="group flex items-center gap-3 rounded-xl bg-muted p-3 text-sm"
            >
              {editing === task.id ? (
                <form
                  className="flex min-w-0 flex-1 gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void saveEdit(task.id)
                  }}
                >
                  <input
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    autoFocus
                    className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1"
                  />
                  <Button size="sm" type="submit" aria-label="Speichern">
                    <Check />
                  </Button>
                </form>
              ) : (
                <>
                  <Check className="size-4 shrink-0 text-emerald-400" />
                  <span className="min-w-0 flex-1 break-words">
                    {task.content}
                  </span>
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100">
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Aufgabe bearbeiten"
                      onClick={() => {
                        setEditing(task.id)
                        setEditText(task.content)
                      }}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Aufgabe löschen"
                      onClick={() => {
                        if (window.confirm("Aufgabe wirklich löschen?")) {
                          void run(window.adhdworker.deleteTask(task.id))
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="mt-3 flex gap-2" onSubmit={(event) => void add(event)}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="z. B. Tickets beantwortet"
          aria-label={`Aufgabe für „${partLabel(part)}“`}
          maxLength={500}
          autoComplete="off"
          className="min-h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <Button type="submit" className="min-h-10" disabled={!text.trim()}>
          <Plus /> Aufgabe hinzufügen
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

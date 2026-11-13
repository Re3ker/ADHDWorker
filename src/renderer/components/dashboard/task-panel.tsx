import { useState } from "react"
import { Check, Pencil, Plus, Trash2 } from "lucide-react"

import type { WorkdayData } from "../../../shared/types"
import { Button } from "../ui/button"

/** Schnelle Aufgabeneingabe: tippen, Enter, fertig. */
export function TaskPanel({ workday }: { workday: WorkdayData }) {
  const [text, setText] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState("")
  const workSessions = workday.sessions.filter(
    (session) => session.type === "work"
  )

  async function run(result: Promise<{ ok: boolean; error?: string }>) {
    const response = await result
    setError(response.ok ? null : (response.error ?? "Nicht gespeichert."))
    return response.ok
  }

  async function add(event: React.FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    if (await run(window.adhdworker.createTask({ content: text }))) setText("")
  }

  async function saveEdit(taskId: string) {
    if (await run(window.adhdworker.updateTask({ taskId, content: editText })))
      setEditing(null)
  }

  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-7">
      <h2 className="text-lg font-semibold">Was hast du erledigt?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Wird automatisch gespeichert und bei Pause und Feierabend mitgeschickt.
      </p>
      <form className="mt-4 flex gap-2" onSubmit={(event) => void add(event)}>
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="z. B. Tickets beantwortet"
          aria-label="Neue Aufgabe"
          maxLength={500}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm"
        />
        <Button
          type="submit"
          size="lg"
          className="min-h-11"
          disabled={!text.trim()}
        >
          <Plus /> Hinzufügen
        </Button>
      </form>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}

      <div className="mt-5 space-y-4">
        {workSessions.every((session) => session.tasks.length === 0) ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            Noch keine Aufgaben. Der erste Eintrag darf klein sein.
          </p>
        ) : (
          workSessions.map((session, index) =>
            session.tasks.length === 0 ? null : (
              <div key={session.id}>
                {workSessions.length > 1 ? (
                  <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {index === 0
                      ? "Vor der Pause"
                      : index === 1
                        ? "Nach der Pause"
                        : `Abschnitt ${index + 1}`}
                  </p>
                ) : null}
                <ul className="space-y-2">
                  {session.tasks.map((task) => (
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
                            onChange={(event) =>
                              setEditText(event.target.value)
                            }
                            autoFocus
                            className="min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-1"
                          />
                          <Button
                            size="sm"
                            type="submit"
                            aria-label="Speichern"
                          >
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
                                if (
                                  window.confirm("Aufgabe wirklich löschen?")
                                ) {
                                  void run(
                                    window.adhdworker.deleteTask(task.id)
                                  )
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
              </div>
            )
          )
        )}
      </div>
    </section>
  )
}

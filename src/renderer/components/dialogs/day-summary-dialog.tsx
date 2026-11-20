import { createDayBlocks, netWorkMinutes } from "../../../shared/day-export"
import { formatDateLong, formatDuration } from "../../../shared/time"
import type { WorkdayData } from "../../../shared/types"
import { Button } from "../ui/button"
import { CopyField } from "../ui/copy-field"
import { Dialog } from "../ui/dialog"

/** Tagesabschluss: pro Abschnitt Aufgaben, Start und Ende zum Kopieren. */
export function DaySummaryDialog({
  workday,
  onClose,
}: {
  workday: WorkdayData
  onClose: () => void
}) {
  const blocks = createDayBlocks(workday.sessions, workday.tasks)
  return (
    <Dialog
      wide
      eyebrow="Tagesabschluss"
      title={formatDateLong(workday.endedAt ?? workday.actualStartAt)}
      description={
        <>
          Netto gearbeitet:{" "}
          <strong>{formatDuration(netWorkMinutes(workday.sessions))}</strong>.
          Klicke ein Feld an, um es zu kopieren.
        </>
      }
      onClose={onClose}
    >
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            Für diesen Tag gibt es keine abgeschlossenen Arbeitsabschnitte.
          </p>
        ) : (
          blocks.map((block) => (
            <section
              key={block.id}
              className="rounded-2xl border border-border bg-muted/60 p-4"
            >
              <h3 className="mb-3 text-sm font-semibold">{block.label}</h3>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]">
                <CopyField label="Aufgaben" value={block.tasks} />
                <CopyField label="Start" value={block.start} mono />
                <CopyField label="Ende" value={block.end} mono />
              </div>
            </section>
          ))
        )}
      </div>
      <div className="mt-6 flex justify-end">
        <Button size="lg" onClick={onClose}>
          Fertig
        </Button>
      </div>
    </Dialog>
  )
}

import { useState } from "react"
import { Check, Clipboard } from "lucide-react"

/** Ein Wert mit Kopier-Button und deutlichem „Kopiert“-Feedback. */
export function CopyField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <button
        type="button"
        onClick={copy}
        disabled={!value}
        title="Klicken zum Kopieren"
        className={`group flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${
          copied
            ? "border-emerald-400/60 bg-emerald-400/10"
            : "border-input bg-background hover:border-primary/60"
        }`}
      >
        <span
          className={`min-w-0 flex-1 break-words ${mono ? "font-mono text-base" : ""}`}
        >
          {value || "—"}
        </span>
        {copied ? (
          <Check
            className="size-4 shrink-0 text-emerald-400"
            aria-label="Kopiert"
          />
        ) : (
          <Clipboard className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
        )}
      </button>
    </div>
  )
}

import { useEffect } from "react"
import { X } from "lucide-react"

import { Button } from "./button"

type DialogProps = {
  title: string
  eyebrow?: string
  description?: React.ReactNode
  tone?: "default" | "alert"
  onClose?: () => void
  children: React.ReactNode
  wide?: boolean
}

export function Dialog({
  title,
  eyebrow,
  description,
  tone = "default",
  onClose,
  children,
  wide,
}: DialogProps) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-3xl border bg-card p-7 shadow-2xl ${
          wide ? "max-w-3xl" : "max-w-xl"
        } ${tone === "alert" ? "border-destructive/60" : "border-border"}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p
                className={`text-sm font-medium ${
                  tone === "alert" ? "text-destructive" : "text-primary"
                }`}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              id="dialog-title"
              className="mt-1 text-2xl font-semibold tracking-tight"
            >
              {title}
            </h2>
            {description ? (
              <div className="mt-2 text-muted-foreground">{description}</div>
            ) : null}
          </div>
          {onClose ? (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={onClose}
              aria-label="Schließen"
            >
              <X />
            </Button>
          ) : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  )
}

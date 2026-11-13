import { useEffect, useState } from "react"
import { Coffee, LogIn, LogOut, Play, type LucideIcon } from "lucide-react"

import type { ActionType } from "../../shared/types"

type ActionCopy = {
  /** Überschrift im Erinnerungsdialog */
  title: string
  /** Satzteil nach „Jetzt“ / „Um 12:00“ */
  verb: string
  /** Kurzer Button-Text im Dashboard */
  button: string
  /** Name des Schritts in der Tagesleiste */
  step: string
  icon: LucideIcon
}

export const ACTIONS: Record<ActionType, ActionCopy> = {
  start: {
    title: "Zeit zum Anmelden",
    verb: "anmelden",
    button: "Anmelden",
    step: "Anmelden",
    icon: LogIn,
  },
  pause: {
    title: "Gleich ist Pause",
    verb: "zur Pause abmelden",
    button: "Zur Pause abmelden",
    step: "Pause",
    icon: Coffee,
  },
  resume: {
    title: "Pause ist vorbei",
    verb: "wieder anmelden",
    button: "Wieder anmelden",
    step: "Wieder da",
    icon: Play,
  },
  end: {
    title: "Gleich ist Feierabend",
    verb: "abmelden (Feierabend)",
    button: "Feierabend – abmelden",
    step: "Feierabend",
    icon: LogOut,
  },
}

/** Aktuelle Zeit, jede Sekunde neu – für Countdown und Nettozeit. */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}

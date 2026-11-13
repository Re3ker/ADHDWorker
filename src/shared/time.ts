import { de } from "date-fns/locale"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const APP_TIMEZONE = "Europe/Berlin"

type DateLike = Date | string

function format(value: DateLike | null | undefined, pattern: string) {
  if (!value) return "—"
  return formatInTimeZone(new Date(value), APP_TIMEZONE, pattern, {
    locale: de,
  })
}

/** 08:45 */
export const formatTime = (value?: DateLike | null) => format(value, "HH:mm")
/** 0845 – für die Kopierfelder */
export const formatClock = (value?: DateLike | null) => format(value, "HHmm")
/** 13.11.2026 */
export const formatDate = (value?: DateLike | null) =>
  format(value, "dd.MM.yyyy")
/** Freitag, 13. November 2026 */
export const formatDateLong = (value?: DateLike | null) =>
  format(value, "EEEE, dd. MMMM yyyy")

/** 7:45 h */
export function formatDuration(minutes: number) {
  const safe = Math.max(0, Math.floor(minutes))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")} h`
}

export function dateKey(value: DateLike = new Date()) {
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "yyyy-MM-dd")
}

/** Uhrzeit "HH:mm" am heutigen Berliner Tag als Date (UTC). */
export function todayAt(time: string, now: Date = new Date()) {
  return fromZonedTime(`${dateKey(now)}T${time}:00`, APP_TIMEZONE)
}

export function startOfToday(now: Date = new Date()) {
  return todayAt("00:00", now)
}

/** Montag bis Freitag in Berlin. */
export function isWeekday(now: Date = new Date()) {
  const day = Number(formatInTimeZone(now, APP_TIMEZONE, "i"))
  return day >= 1 && day <= 5
}

export function addMinutes(value: DateLike, minutes: number) {
  return new Date(new Date(value).getTime() + minutes * 60_000)
}

export function minutesBetween(start: DateLike, end: DateLike) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60_000
}

/** "08:45" + 15 → "09:00" */
export function shiftTime(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number)
  const total = (((hours * 60 + mins + minutes) % 1440) + 1440) % 1440
  const hh = String(Math.floor(total / 60)).padStart(2, "0")
  return `${hh}:${String(total % 60).padStart(2, "0")}`
}

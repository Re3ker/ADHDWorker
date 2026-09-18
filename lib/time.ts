import { format, differenceInMinutes, isBefore } from "date-fns"
import { de } from "date-fns/locale"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Europe/Berlin"

export function formatTime(value: Date | string | null | undefined) {
  if (!value) return "—"
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "HH:mm")
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—"
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "dd.MM.yyyy")
}

export function formatDateLong(value: Date | string | null | undefined) {
  if (!value) return "—"
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "EEEE, dd. MMMM yyyy", { locale: de })
}

export function localDateInputValue(value = new Date()) {
  return formatInTimeZone(value, APP_TIMEZONE, "yyyy-MM-dd")
}

export function localTimeInputValue(value = new Date()) {
  return formatInTimeZone(value, APP_TIMEZONE, "HH:mm")
}

export function zonedLocalDateTime(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, APP_TIMEZONE)
}

export function formatDurationMinutes(minutes: number) {
  const safe = Math.max(0, Math.floor(minutes))
  const hours = Math.floor(safe / 60)
  const rest = safe % 60
  return `${String(hours).padStart(2, "0")}h ${String(rest).padStart(2, "0")}m`
}

export function durationBetween(start: Date | string, end: Date | string | null = new Date()) {
  return end ? differenceInMinutes(new Date(end), new Date(start)) : 0
}

export function calculateNetMinutes(
  sessions: Array<{ type: string; startedAt: Date | string; endedAt: Date | string | null }>,
) {
  return sessions
    .filter((session) => session.type === "work" && session.endedAt)
    .reduce((total, session) => total + durationBetween(session.startedAt, session.endedAt), 0)
}

export function isPast(value: Date) {
  return isBefore(value, new Date())
}

export function formatClock(value: Date | string | null | undefined) {
  if (!value) return "—"
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "HHmm")
}

export function formatIsoForClient(value: Date | null | undefined) {
  return value?.toISOString() ?? null
}

export function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—"
  return formatInTimeZone(new Date(value), APP_TIMEZONE, "dd.MM. HH:mm")
}

export function formatInputDate(value: Date) {
  return format(value, "yyyy-MM-dd")
}

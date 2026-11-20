/**
 * Spielt einen kompletten Tag gegen SQLite durch:
 * Anmeldung vormerken → pünktlich ausführen → Pause → zu spät zurück →
 * Feierabend nach Soll-Stunden → kopierbare Blöcke. Dazu Erinnerungslogik.
 */
import { rm } from "node:fs/promises"
import { resolve } from "node:path"
import { fromZonedTime } from "date-fns-tz"

import { configureDatabase, getDb } from "../src/main/db"
import { runMigrations } from "../src/main/migrations"
import { currentReminder } from "../src/main/reminders"
import { getSettings } from "../src/main/settings-service"
import {
  adjustTime,
  createTask,
  getCurrentWorkday,
  getWorkdayById,
  requestAction,
  runDuePendingAction,
} from "../src/main/workday-service"
import { createDayBlocks } from "../src/shared/day-export"
import { computeDayPlan } from "../src/shared/day-plan"
import {
  APP_TIMEZONE,
  addMinutes,
  formatTime,
  todayAt,
} from "../src/shared/time"

const databasePath = resolve(process.env.ADHDWORKER_SMOKE_DB || "prisma/dev.db")
const isTemporaryDatabase = Boolean(process.env.ADHDWORKER_SMOKE_DB)
await runMigrations(databasePath)
configureDatabase(databasePath)
const db = getDb()

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Smoke-Test fehlgeschlagen: ${message}`)
}

const at = (time: string) => todayAt(time)
const original = await getSettings()
const planSettings = {
  startTime: "08:45",
  pauseTime: "12:00",
  pauseMinutes: 30,
  targetWorkMinutes: 480,
  leadMinutes: 1,
}
let workdayId = ""

try {
  if (await getCurrentWorkday()) {
    console.log(
      JSON.stringify({ status: "skipped", reason: "open workday exists" })
    )
  } else {
    await db.settings.update({ where: { id: 1 }, data: planSettings })

    // 1. Anmeldung für 09:00 vormerken (bestätigt um 08:44).
    const planned = await requestAction(
      { type: "start", at: "09:00", message: null, sendNow: true },
      at("08:44")
    )
    assert(planned.executed === null, "Start wurde nicht vorgemerkt")
    // Anmelde-Nachricht geht sofort raus, nennt aber 09:00.
    const early = await db.telegramMessage.findUnique({
      where: { id: planned.messageId ?? "" },
    })
    assert(
      early?.type === "start" && early.content.includes("09:00"),
      "Anmelde-Nachricht nicht sofort erstellt"
    )
    let workday = await getCurrentWorkday()
    assert(
      workday?.status === "planned" && workday.pendingAction === "start",
      "Tag nicht geplant"
    )
    workdayId = workday.id
    assert(
      (await runDuePendingAction(at("08:59"))) === null,
      "Start lief zu früh"
    )

    // 2. Worker führt sie exakt um 09:00 aus.
    const started = await runDuePendingAction(addMinutes(at("09:00"), 0.1))
    assert(
      started?.type === "start" && started.messageId === null,
      "Start nicht ausgeführt oder Nachricht doppelt"
    )
    workday = await getCurrentWorkday()
    assert(
      formatTime(workday?.actualStartAt) === "09:00",
      "Startzeit ist nicht 09:00"
    )

    await createTask({ workdayId, part: 0, content: "Tickets beantwortet" })
    // Vorab für die zweite Tageshälfte notiert – darf nicht in die Pause-Nachricht.
    await createTask({ workdayId, part: 1, content: "Vorab notiert" })

    // 3. Pause 12:30 erst um 12:40 bestätigt → eingetragen wird 12:30.
    const paused = await requestAction(
      { type: "pause", at: "12:30", message: null, pauseMinutes: 30 },
      at("12:40")
    )
    assert(paused.executed?.type === "pause", "Pause nicht ausgeführt")
    assert(
      (await getSettings()).pauseTime === "12:30",
      "Pausenzeit 12:30 wurde nicht als Standard gemerkt"
    )

    // 4. Fünf Minuten zu spät zurück, „Jetzt“ gewählt → 13:05.
    const resumed = await requestAction(
      { type: "resume", at: null, message: null },
      at("13:05")
    )
    assert(
      resumed.executed?.type === "resume",
      "Wieder anmelden nicht sofort ausgeführt"
    )

    // 5. Feierabend verschiebt sich: 09:00 + 8 h + 35 Min Pause = 17:35.
    workday = await getCurrentWorkday()
    assert(workday, "Arbeitstag fehlt")
    const plan = computeDayPlan(at("13:10"), planSettings, workday)
    assert(
      formatTime(plan.endAt) === "17:35",
      `Feierabend ${formatTime(plan.endAt)} statt 17:35`
    )

    await createTask({ workdayId, part: 1, content: "Review gemacht" })
    // Nachmittags etwas für vor der Pause nachgetragen.
    await createTask({ workdayId, part: 0, content: "Nachtrag" })
    const ended = await requestAction(
      { type: "end", at: null, message: null },
      plan.endAt
    )
    assert(ended.executed?.type === "end", "Feierabend nicht ausgeführt")

    const finished = await getWorkdayById(workdayId)
    assert(finished?.status === "finished", "Tag nicht beendet")
    const blocks = createDayBlocks(finished.sessions, finished.tasks)
    assert(blocks.length === 2, "Es sollten zwei Abschnitte sein")
    assert(
      blocks[0].tasks === "Tickets beantwortet, Nachtrag" &&
        blocks[0].start === "0900" &&
        blocks[0].end === "1230",
      "Block 1 falsch"
    )
    assert(
      blocks[1].tasks === "Vorab notiert, Review gemacht" &&
        blocks[1].start === "1305" &&
        blocks[1].end === "1735",
      "Block 2 falsch"
    )
    const pauseMessage = finished.telegramMessages.find(
      (message) => message.type === "pause"
    )
    assert(
      pauseMessage?.content.includes("Tickets beantwortet") &&
        !pauseMessage.content.includes("Vorab notiert"),
      "Pause-Nachricht mit falschen Aufgaben"
    )
    const endMessage = finished.telegramMessages.find(
      (message) => message.type === "end"
    )
    assert(
      endMessage?.content.includes("Vorab notiert") &&
        endMessage.content.includes("Review gemacht"),
      "Feierabend-Nachricht ohne Aufgaben nach der Pause"
    )
    assert(
      finished.telegramMessages.length === 4,
      "Es sollten vier Meldungen sein"
    )

    // 6. Zeiten nachträglich korrigieren.
    const lateEvening = at("23:59")
    await adjustTime({ workdayId, step: "start", at: "08:55" }, lateEvening)
    await adjustTime({ workdayId, step: "end", at: "17:40" }, lateEvening)
    const invalid = await adjustTime(
      { workdayId, step: "resume", at: "12:20" },
      lateEvening
    ).then(
      () => false,
      () => true
    )
    assert(invalid, "Wieder da vor Pausenbeginn wurde akzeptiert")
    const correctedDay = (await getWorkdayById(workdayId))!
    const corrected = createDayBlocks(correctedDay.sessions, correctedDay.tasks)
    assert(
      corrected[0].start === "0855" && corrected[1].end === "1740",
      "Korrektur nicht übernommen"
    )

    // 7. Erinnerungen: Montag 08:44 → Anmelden; 08:43 → noch nicht; Samstag → nie.
    const monday = (time: string) =>
      fromZonedTime(`2099-01-05T${time}:00`, APP_TIMEZONE)
    assert(
      (await currentReminder(monday("08:44")))?.type === "start",
      "Keine Anmelde-Erinnerung"
    )
    assert(
      (await currentReminder(monday("08:43"))) === null,
      "Erinnerung kam zu früh"
    )
    const saturday = fromZonedTime("2099-01-10T08:44:00", APP_TIMEZONE)
    assert(
      (await currentReminder(saturday)) === null,
      "Erinnerung am Wochenende"
    )

    console.log(JSON.stringify({ status: "ok", blocks }, null, 2))
  }
} finally {
  if (workdayId)
    await db.workday.delete({ where: { id: workdayId } }).catch(() => undefined)
  await db.settings.update({
    where: { id: 1 },
    data: {
      startTime: original.startTime,
      pauseTime: original.pauseTime,
      pauseMinutes: original.pauseMinutes,
      targetWorkMinutes: original.targetWorkMinutes,
      leadMinutes: original.leadMinutes,
    },
  })
  await db.$disconnect()
  if (isTemporaryDatabase) await rm(databasePath, { force: true })
}

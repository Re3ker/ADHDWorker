import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from "node:fs"
import { dirname, join } from "node:path"

import { dateKey } from "../shared/time"

const BACKUP_FILE = /^adhdworker-\d{4}-\d{2}-\d{2}\.sqlite$/

/**
 * Eine Kopie pro Tag, bevor Migrationen laufen oder Prisma die Datei öffnet.
 * Behält die letzten `keep` Tage. Fehler blockieren den App-Start nie.
 */
export function backupDatabase(databasePath: string, keep = 14) {
  try {
    if (!existsSync(databasePath)) return null
    const directory = join(dirname(databasePath), "backups")
    mkdirSync(directory, { recursive: true })
    const target = join(directory, `adhdworker-${dateKey()}.sqlite`)
    if (!existsSync(target)) copyFileSync(databasePath, target)

    const backups = readdirSync(directory)
      .filter((name) => BACKUP_FILE.test(name))
      .sort()
    for (const name of backups.slice(0, Math.max(0, backups.length - keep))) {
      unlinkSync(join(directory, name))
    }
    return target
  } catch (error) {
    console.error("Datenbank-Sicherung fehlgeschlagen:", error)
    return null
  }
}

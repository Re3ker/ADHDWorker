import { PrismaClient } from "@prisma/client"
import { app } from "electron"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

function migrationDirectory() {
  return app.isPackaged
    ? join(process.resourcesPath, "migrations")
    : join(app.getAppPath(), "prisma", "migrations")
}

function migrationStatements(sql: string) {
  return sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean)
}

export async function runMigrations(databasePath: string) {
  const directory = migrationDirectory()
  if (!existsSync(directory)) throw new Error("SQLite-Migrationen fehlen in der App-Installation.")
  const client = new PrismaClient({ datasources: { db: { url: `file:${databasePath.replaceAll("\\", "/")}` } } })
  try {
    await client.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "_adhdworker_migrations" ("name" TEXT NOT NULL PRIMARY KEY, "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)')
    const applied = await client.$queryRawUnsafe<Array<{ name: string }>>('SELECT "name" FROM "_adhdworker_migrations"')
    const appliedNames = new Set(applied.map((migration) => migration.name))
    const existingSettingsTable = await client.$queryRawUnsafe<Array<{ name: string }>>('SELECT "name" FROM "sqlite_master" WHERE "type" = \'table\' AND "name" = \'Settings\'')
    const migrations = readdirSync(directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
    for (const name of migrations) {
      if (appliedNames.has(name)) continue
      const sqlPath = join(directory, name, "migration.sql")
      if (!existsSync(sqlPath)) continue
      if (name.endsWith("_init_sqlite") && existingSettingsTable.length > 0) {
        await client.$executeRawUnsafe('INSERT INTO "_adhdworker_migrations" ("name") VALUES (?)', name)
        continue
      }
      const statements = migrationStatements(readFileSync(sqlPath, "utf8"))
      await client.$transaction(async (tx) => {
        for (const statement of statements) await tx.$executeRawUnsafe(statement)
        await tx.$executeRawUnsafe('INSERT INTO "_adhdworker_migrations" ("name") VALUES (?)', name)
      })
    }
  } finally {
    await client.$disconnect()
  }
}

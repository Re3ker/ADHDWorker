import { PrismaClient } from "@prisma/client"

let client: PrismaClient | null = null

export function configureDatabase(databasePath: string) {
  if (client) return client
  client = new PrismaClient({
    datasources: { db: { url: `file:${databasePath.replaceAll("\\", "/")}` } },
  })
  return client
}

export function getDb() {
  if (!client) throw new Error("Die lokale Datenbank wurde noch nicht initialisiert.")
  return client
}

export async function disconnectDatabase() {
  if (!client) return
  await client.$disconnect()
  client = null
}

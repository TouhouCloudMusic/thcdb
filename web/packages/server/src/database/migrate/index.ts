import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"

const { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } = process.env

const host = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`

console.log(`🐛 Migrating database "${host}`)

const migrate_connection = postgres(
  `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`,
  { max: 1, connect_timeout: 10000 },
)

await migrate(drizzle(migrate_connection), { migrationsFolder: "./drizzle" })

await migrate_connection.end()

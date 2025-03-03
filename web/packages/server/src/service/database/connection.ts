import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { schema } from "~/database"

const { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } = process.env
const url = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`
export type DB = typeof db

const client = postgres(url)
export const db = drizzle({
  client,
  schema,
  logger: true,
})

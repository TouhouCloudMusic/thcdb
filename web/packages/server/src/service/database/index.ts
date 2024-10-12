import { drizzle } from "drizzle-orm/connect"
import { Elysia } from "elysia"
import * as schema from "~/database/schema"

const { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } = process.env
const url = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`

export type DB = typeof db

export const db = await drizzle("postgres-js", {
  connection: {
    url: url,
  },
  schema,
  logger: true,
})

export const database_service = new Elysia({
  name: "Service.Database",
}).decorate("db", () => db)

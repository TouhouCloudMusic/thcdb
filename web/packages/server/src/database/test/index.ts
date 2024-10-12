import { drizzle } from "drizzle-orm/connect"
import * as schema from "../schema"

const { DB_HOST, DB_NAME, DB_PASSWORD, DB_USER } = process.env

const url = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`

export const db = await drizzle("postgres-js", {
  connection: {
    url,
  },
  schema,
})

console.log(`🐛 Connected database at"${url}`)

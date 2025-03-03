import { drizzle } from "drizzle-orm/postgres-js"

const { DB_HOST, DB_PASSWORD, DB_USER, DB_NAME } = process.env
const connection = drizzle({
  connection: {
    url: `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}/${DB_NAME}`,
  },
  logger: true,
})

export { connection as default }

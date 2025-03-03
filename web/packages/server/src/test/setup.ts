import { afterAll, beforeAll } from "bun:test"
import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { createCustomType } from "scripts/init_database/create_type"
import { initLookupTable } from "scripts/init_database/init_lookup_table"
import { test_db, test_db_client, test_db_url } from "./singletons"

const db = drizzle(postgres(test_db_url))

beforeAll(async () => {
  await db.execute(sql.raw(`CREATE DATABASE ${process.env.TEST_DB_NAME};`))
  await createCustomType(test_db)
  await migrate(test_db, { migrationsFolder: "./drizzle" })
  await initLookupTable(test_db)
})

afterAll(async () => {
  await test_db_client.end()
  await db.execute(sql.raw(`DROP DATABASE ${process.env.TEST_DB_NAME};`))
})

import { sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"

async function main() {
  const { DB_HOST, DB_PASSWORD, DB_USER, DB_NAME } = process.env
  const url1 = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}`

  const db1 = drizzle({
    connection: {
      url: url1,
    },
    logger: true,
  })

  await db1.execute(
    sql.raw(`
	DO $$
	BEGIN
		IF NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}') THEN
				PERFORM dblink_exec('dbname=postgres', 'CREATE DATABASE ${DB_NAME}');
		END IF;
	END
	$$;
	`),
  )
}

await main()
process.exit(0)

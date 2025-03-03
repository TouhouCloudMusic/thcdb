import { sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"

export async function createCustomType<T extends Record<string, unknown>>(
  db: PostgresJsDatabase<T>,
) {
  await db.execute(
    sql.raw(`
			CREATE TYPE location_tuple AS (
				country 		text,
				subdivision text,
				city 				text
			);

			CREATE OR REPLACE FUNCTION update_updated_at_on_update()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = now();
				RETURN NEW;
			END
			$$ language 'plpgsql'
		`),
  )
}

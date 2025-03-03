import { sql } from "drizzle-orm"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import { role_table } from "~/database"
import { USER_ROLE } from "~/database/lookup_tables/role"
import { language_table } from "../../src/database/lookup_tables"
import { LANGUAGES } from "../../src/database/lookup_tables/lang"

export async function initLookupTable(db: PostgresJsDatabase<any>) {
  await db
    .insert(language_table)
    .values(LANGUAGES)
    .onConflictDoUpdate({
      target: language_table.id,
      set: {
        name: sql.raw(`excluded.${language_table.name.name}`),
      },
    })

  await db
    .insert(role_table)
    .values(Object.values(USER_ROLE))
    .onConflictDoNothing()
}

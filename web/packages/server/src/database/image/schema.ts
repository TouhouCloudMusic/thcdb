import { integer, pgTable, text } from "drizzle-orm/pg-core"
import { user } from "../user/schema"
import { created_at } from "../utils/created_and_updated_at"

export const image_table = pgTable("image", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  filename: text().notNull(),
  uploaded_by: integer()
    .references(() => user.id)
    .notNull(),
  ...created_at,
})

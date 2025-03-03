import { pgEnum, pgTable } from "drizzle-orm/pg-core"
import { user } from "../schema"
import { created_and_updated_at } from "../utils/created_and_updated_at"

export const entity_type = pgEnum("entity_type", [
  "Artist",
  "Label",
  "Release",
  "Role",
  "Song",
])

export const queue_type = pgEnum("queue_type", ["Create", "Update", "Delete"])

export const queue_status = pgEnum("queue_status", ["Open", "Closed", "Merged"])

export const queue_table = pgTable("queue", (t) => ({
  id: t.integer().primaryKey().generatedByDefaultAsIdentity(),
  entity_type: entity_type().notNull(),
  entity_id: t.integer().notNull(),
  status: queue_status().notNull().default("Open"),
  old_data: t.jsonb(),
  new_data: t.jsonb().notNull(),
  author: t
    .integer()
    .references(() => user.id)
    .notNull(),
  approver: t.integer().references(() => user.id),
  ...created_and_updated_at,
}))

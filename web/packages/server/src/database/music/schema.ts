import { integer, pgEnum, pgTable, text, varchar } from "drizzle-orm/pg-core"
import { created_and_updated_at } from "../utils/created_and_updated_at"

export type CreditRole = typeof credit_role.$inferSelect
export type NewCreditRole = typeof credit_role.$inferInsert

export const credit_role = pgTable("credit_role", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 128 }).notNull(),
  alias: varchar("alias", { length: 128 }).array(),
  short_desctiption: varchar("short_desc", { length: 128 }),
  description: text("description"),
  ...created_and_updated_at,
})

export const credit_role_inheritance = pgTable("credit_role_inheritance", {
  parent_id: integer("parent_id")
    .references(() => credit_role.id)
    .notNull(),
  children_id: integer("children_id")
    .references(() => credit_role.id)
    .notNull(),
})

export const tag_type = pgEnum("tag_type", ["Genre", "Descriptor"])
export const tag = pgTable("tag", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 128 }).notNull(),
  type: tag_type("type").notNull(),
  ...created_and_updated_at,
})

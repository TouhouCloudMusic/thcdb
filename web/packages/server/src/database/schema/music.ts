import { pgEnum, pgTable, serial, text, varchar } from "drizzle-orm/pg-core"
import { created_and_updated_at } from "./utils/created_and_updated_at"
export type MusicRole = typeof music_role.$inferSelect
export type NewMusicRole = typeof music_role.$inferInsert
export const music_role = pgTable("music_role", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  alias: varchar("alias", { length: 128 }).array(),
  short_desctiption: varchar("short_desc", { length: 128 }),
  description: text("description"),
  ...created_and_updated_at,
})

export const music_role_inheritance = pgTable("music_role_inheritance", {
  parent_id: serial("parent_id")
    .references(() => music_role.id)
    .notNull(),
  children_id: serial("children_id")
    .references(() => music_role.id)
    .notNull(),
})

export const tag_type = pgEnum("tag_type", ["Genre", "Descriptor"])
export const tag = pgTable("tag", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  type: tag_type("type").notNull(),
  ...created_and_updated_at,
})

import { relations } from "drizzle-orm"
import {
  type AnyPgColumn,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"
import { location } from "../custom_type"
import { image_table } from "../schema"
import { created_and_updated_at } from "../utils/created_and_updated_at"

export const user = pgTable("user", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 16 }).notNull(),
  email: varchar("email", { length: 128 }),
  password: text().notNull(),
  location: location("location"),
  avatar_id: integer().references((): AnyPgColumn => image_table.id, {
    onDelete: "set null",
  }),
  ...created_and_updated_at,
})

export const user_relations = relations(user, ({ one, many }) => ({
  session: one(session),
  avatar: one(image_table, {
    fields: [user.avatar_id],
    references: [image_table.id],
  }),
  role: many(user_role_table),
}))

export const user_role_table = pgTable(
  "user_role",
  {
    user_id: integer("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    role_id: integer("role_id")
      .references(() => role_table.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.user_id, t.role_id] }),
  }),
)

export const user_role_table_relations = relations(
  user_role_table,
  ({ one }) => ({
    user: one(user, {
      fields: [user_role_table.user_id],
      references: [user.id],
    }),
    role: one(role_table, {
      fields: [user_role_table.role_id],
      references: [role_table.id],
    }),
  }),
)

export const role_table = pgTable("role", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(),
  name: text().notNull(),
})

export const session = pgTable("session", {
  id: text().primaryKey(),
  user_id: integer()
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  expires_at: timestamp({ withTimezone: true }).notNull(),
})

export const session_relations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.user_id],
    references: [user.id],
  }),
}))

import { relations } from "drizzle-orm"
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { location } from "./custom_type"
import { created_and_updated_at } from "./utils/created_and_updated_at"

export const user = pgTable(
  "user",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 16 }).notNull(),
    email: varchar("email", { length: 128 }),
    password: text().notNull(),
    location: location("location"),
    ...created_and_updated_at,
  },
  (t) => ({
    unq_name: uniqueIndex().on(t.name),
  }),
)

export const user_relations = relations(user, ({ one }) => ({
  session: one(session),
}))

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    user_id: integer()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expires_at: timestamp().notNull(),
  },
  (t) => ({
    unq: uniqueIndex().on(t.user_id),
  }),
)

export const session_relations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.user_id],
    references: [user.id],
  }),
}))

import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  varchar,
} from "drizzle-orm/pg-core"
import { artist } from "./artist"
import { location } from "./custom_type"
import { date_precision } from "./enum"
import { localization_language } from "./lang"
import { created_and_updated_at } from "./utils/created_and_updated_at"

export type Label = typeof label.$inferSelect
export type NewLabel = typeof label.$inferInsert
export const label = pgTable("label", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  founded_date: date("founded_date"),
  founded_date_precision: date_precision("founded_date_prec"),
  dissolved_date: date("dissolved_date"),
  dissolved_date_precision: date_precision("dissolved_date_prec"),
  founded_location: location("founded_location"),
  dissolved_location: location("dissolved_location"),
  ...created_and_updated_at,
})

export const label_localized_name = pgTable(
  "label_localized_name",
  {
    label_id: integer("label_id")
      .references(() => artist.id)
      .notNull(),
    language: localization_language("language").notNull(),
    name: varchar("name", { length: 128 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.label_id, t.language, t.name] }),
    name_idx: index().on(t.name),
  }),
)

export const label_founder = pgTable(
  "label_founder",
  {
    label_id: integer("label_id")
      .references(() => label.id)
      .notNull(),
    artist_id: integer("artist_id")
      .references(() => artist.id)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.label_id, t.artist_id] }),
  }),
)

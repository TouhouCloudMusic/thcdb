import {
  integer,
  interval,
  pgTable,
  primaryKey,
  serial,
  varchar,
} from "drizzle-orm/pg-core"
import { artist } from "./artist"
import { localization_language } from "./lang"

export const song = pgTable("song", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 128 }).notNull(),
  duration: interval("duration", { fields: "hour to second" }),
})

export const song_localized_title = pgTable(
  "song_localized_title",
  {
    song_id: integer("song_id")
      .references(() => song.id)
      .notNull(),
    language: localization_language("language").notNull(),
    title: varchar("title", { length: 128 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.song_id, t.language] }),
  }),
)

export const song_language = pgTable(
  "song_language",
  {
    song_id: integer("song_id")
      .references(() => song.id)
      .notNull(),
    language: localization_language("language").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.song_id, t.language] }),
  }),
)

export const song_artist = pgTable(
  "song_artist",
  {
    song_id: integer("song_id")
      .references(() => song.id)
      .notNull(),
    artist_id: integer("member_id")
      .references(() => artist.id)
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.song_id, t.artist_id] }),
  }),
)

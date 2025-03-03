import {
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  varchar,
} from "drizzle-orm/pg-core"
import { artist } from "../artist"
import { created_and_updated_at } from "../utils/created_and_updated_at"

export const song = pgTable("song", (t) => ({
  id: t.integer().primaryKey().generatedByDefaultAsIdentity(),
  title: t.text().notNull(),
  languages: t.smallint().array(),
  duration: t.interval("duration", { fields: "hour to second" }),
  lyric: t.text(),
  ...created_and_updated_at,
}))

export const song_title_translation = pgTable(
  "song_title_translation",
  {
    song_id: integer("song_id")
      .references(() => song.id)
      .notNull(),
    language: smallint().notNull(),
    title: varchar("title", { length: 128 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.song_id, t.language] }),
    title_idx: index().on(t.title),
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

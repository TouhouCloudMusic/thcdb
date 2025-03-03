import { relations } from "drizzle-orm"
import {
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"
import { artist } from "../artist"
import { date_precision } from "../enums"
import { song } from "../song/schema"
import { created_and_updated_at } from "../utils/created_and_updated_at"
import { credit_cons } from "../utils/vote"

const release_type_enum = pgEnum("release_type", ["Album", "EP", "Single"])
export type ReleaseType = (typeof release_type_enum.enumValues)[number]
export const release = pgTable("release", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: varchar("title", { length: 128 }).notNull(),
  release_type: release_type_enum().notNull(),
  release_date: date("release_date"),
  release_date_precision: date_precision("release_date_prec"),
  recording_date_start: date("recording_date_start"),
  recording_date_start_precision: date_precision("recording_date_start_prec"),
  recording_date_end: date("recording_date_end"),
  recording_date_end_precision: date_precision("recording_date_end_prec"),
  catalog_number: varchar("catalog_number", { length: 16 }),
  total_disc: integer("total_disc"),
  ...created_and_updated_at,
})

export const release_title_translation = pgTable("release_title_translation", {
  release_id: integer("release_id")
    .references(() => release.id, { onDelete: "cascade" })
    .notNull(),
  language: smallint().notNull(),
  title: varchar("title", { length: 128 }).notNull(),
})

export const release_relation = relations(release, ({ many }) => ({
  artist: many(release_artist),
  localized_title: many(release_title_translation),
}))

export const release_artist = pgTable(
  "release_artist",
  {
    release_id: integer("release_id")
      .references(() => release.id, { onDelete: "cascade" })
      .notNull(),
    artist_id: integer("member_id")
      .references(() => artist.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.release_id, t.artist_id] }),
  }),
)

export const release_artist_relation = relations(release_artist, ({ one }) => ({
  release: one(release, {
    fields: [release_artist.release_id],
    references: [release.id],
  }),
  artist: one(artist, {
    fields: [release_artist.artist_id],
    references: [artist.id],
  }),
}))

export const release_label = pgTable(
  "release_label",
  {
    release_id: integer("release_id")
      .references(() => release.id, { onDelete: "cascade" })
      .notNull(),
    label_id: integer("label_id")
      .references(() => artist.id, { onDelete: "cascade" })
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.release_id, t.label_id] }),
  }),
)

export const release_track = pgTable("release_track", (t) => ({
  id: t.integer().primaryKey().generatedByDefaultAsIdentity(),
  release_id: integer()
    .references(() => release.id, { onDelete: "cascade" })
    .notNull(),
  song_id: integer()
    .references(() => song.id)
    .notNull(),
  track_order: integer().notNull(),
  track_number: varchar({ length: 4 }),
  overwrite_title: varchar({ length: 128 }),
}))

export const release_track_artist = pgTable("release_track_artist", {
  release_track_id: integer()
    .references(() => release_track.id, { onDelete: "cascade" })
    .notNull(),
  artist_id: integer()
    .references(() => artist.id)
    .notNull(),
})

export const release_credit = pgTable(
  "release_credit",
  {
    ...credit_cons(),
    release_id: integer("release_id")
      .references(() => release.id, { onDelete: "cascade" })
      .notNull(),
    on: smallint().array(),
  },
  (t) => ({
    unq: uniqueIndex().on(t.artist_id, t.role_id, t.release_id),
  }),
)

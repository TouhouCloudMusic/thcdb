import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { t } from "elysia"
import { song } from "./schema"

export const song_schema = createSelectSchema(song)

const $ = createInsertSchema(song)
export const new_song_schema = t.Omit($, ["id"])

export type Song = typeof song_schema.static
export type NewSong = typeof new_song_schema.static

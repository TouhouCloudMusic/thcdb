import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { t } from "elysia"
import { link_artist } from "../utils/link_schema"
import { release, release_title_translation, release_track } from "./schema"

// @ts-ignore
const l10n_title = t.Omit(createSelectSchema(release_title_translation), [
  "release_id",
])

const track = t.Omit(createSelectSchema(release_track), ["release_id"])

const link_props = t.Object({
  artist: t.Array(link_artist),
  credit: t.Array(link_artist),
  localized_title: t.Array(l10n_title),
  track: t.Optional(t.Array(track)),
})

export const release_schema = t.Composite([
  // @ts-ignore
  createSelectSchema(release),
  link_props,
])

export type Release = typeof release_schema.static

const new_link_props = t.Object({
  artist: t.Array(t.Integer(), { minItems: 1 }),
  label: t.Optional(t.Array(t.Integer())),
  localized_title: t.Optional(t.Array(l10n_title)),
  track: t.Optional(
    t.Array(
      t.Composite([
        t.Omit(track, ["id", "song_id"]),
        t.Object({
          song_id: t.Optional(t.Integer()),
          artist: t.Array(t.Integer()),
        }),
      ]),
    ),
  ),
})

export const new_release_schema = t.Composite([
  // @ts-ignore
  createInsertSchema(release),
  new_link_props,
])
export type NewRelease = typeof new_release_schema.static

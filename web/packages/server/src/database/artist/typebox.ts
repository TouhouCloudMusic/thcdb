import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { t } from "elysia"
import { link_artist, link_release } from "../utils/link_schema"
import { artist, type artist_type_enum, localized_name } from "./schema"

export type ArtistType = (typeof artist_type_enum.enumValues)[number]

// https://github.com/drizzle-team/drizzle-orm/issues/1810
const text_alias_schema = t.Optional(
  t.Array(
    t.String({
      minLength: 1,
      maxLength: 128,
    }),
  ),
)

const l10n_name = t.Omit(
  // @ts-ignore
  createInsertSchema(localized_name),
  ["artist_id"],
)

const link_props = t.Object({
  aliases: t.Array(link_artist),
  localized_name: t.Optional(t.Array(l10n_name)),
  members: t.Array(link_artist),
  member_of: t.Array(link_artist),
  release: t.Array(link_release),
})

export type ArtistLinks = typeof link_props.static

export const artist_schema = t.Composite([
  // @ts-ignore
  createSelectSchema(artist, {
    text_alias: text_alias_schema,
  }),
  link_props,
])
export type Artist = typeof artist_schema.static

const new_link_props = t.Object({
  localized_name: t.Optional(t.Array(l10n_name)),
})

export const new_artist_schema = t.Composite([
  t.Omit(
    // @ts-ignore
    createInsertSchema(artist, {
      text_alias: text_alias_schema,
    }),
    ["id", "created_at", "updated_at"],
  ),
  new_link_props,
])
export type NewArtist = typeof new_artist_schema.static

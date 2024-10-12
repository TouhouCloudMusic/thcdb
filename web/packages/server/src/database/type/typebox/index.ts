import { createInsertSchema, createSelectSchema } from "drizzle-typebox"
import { t } from "elysia"
import { artist, artist_localized_name } from "~/database/schema"

export * from "./user"

// https://github.com/drizzle-team/drizzle-orm/issues/1810
const text_alias_schema = t.Optional(
  t.Array(
    t.String({
      minLength: 1,
      maxLength: 128,
    }),
  ),
)

const i18n_name_in = createInsertSchema(artist_localized_name)
const _i18n_name_out = createSelectSchema(artist_localized_name)
const i18n_name_out = t.Omit(_i18n_name_out, ["artist_id"])

const gen_artist = createSelectSchema(artist, {
  text_alias: text_alias_schema,
})

const link_props = t.Object({
  aliases: t.Array(t.Object({ id: t.Number(), name: t.String() })),
  localized_name: t.Optional(t.Array(i18n_name_out)),
  members: t.Array(t.Object({ id: t.Number(), name: t.String() })),
  member_of: t.Array(t.Object({ id: t.Number(), name: t.String() })),
  release: t.Array(t.Object({ id: t.Number(), title: t.String() })),
})
export const artist_schema = t.Composite([gen_artist, link_props])

const gen_new_artist = createInsertSchema(artist, {
  text_alias: text_alias_schema,
})

const new_link_props = t.Object({
  localized_name: t.Optional(t.Array(i18n_name_in)),
})

export const new_artist_schema = t.Composite([gen_new_artist, new_link_props])

export type Artist = typeof artist_schema.static
export type NewArtist = typeof new_artist_schema.static

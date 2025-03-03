import * as v from "valibot"
import { DateMask } from "~/lib/form/schema/database.ts"
import { OptionalIDSchema } from "~/lib/form/schema/id"
import { LocalizedLanguageSchema } from "~/lib/form/schema/language.ts"
import { LocationSchema } from "~/lib/form/schema/location.ts"

export const ArtistNameSchema = v.pipe(
  v.string(),
  v.trim(),
  v.nonEmpty("Artist name is required"),
  v.maxLength(128, "Artist name is too long"),
)

export const LocalizedNameSchema = v.nullish(
  v.array(
    v.object({
      language: LocalizedLanguageSchema,
      name: ArtistNameSchema,
    }),
  ),
)

export const ArtistTypeSchema = v.picklist(
  ["Person", "Group"],
  "Artist Type is Requried",
)

export type OptionalYearSchema = v.InferInput<typeof OptionalYearSchema>
export const OptionalYearSchema = v.nullish(
  v.pipe(v.number(), v.minValue(-1), v.maxValue(new Date().getFullYear())),
)

export type AliasSchema = v.InferInput<typeof AliasSchema>
export const AliasSchema = v.object({
  id: OptionalIDSchema,
  name: ArtistNameSchema,
  is_str: v.optional(v.boolean()),
})

export const AliasListSchema = v.optional(v.array(AliasSchema))

export type MemberSchema = v.InferInput<typeof MemberSchema>
export const MemberSchema = v.object(
  {
    id: OptionalIDSchema,
    name: ArtistNameSchema,
    is_str: v.optional(v.boolean()),
    active_year: v.optional(
      v.array(
        v.object({
          lower: OptionalYearSchema,
          upper: OptionalYearSchema,
        }),
      ),
    ),
  },
  "Invalid artist",
)

export type MemberListSchema = v.InferInput<typeof MemberListSchema>
export const MemberListSchema = v.optional(v.array(MemberSchema))

export type ArtistFormSchema = v.InferInput<typeof ArtistFormSchema>
export const ArtistFormSchema = v.object({
  id: OptionalIDSchema,
  // basic info
  name: ArtistNameSchema,
  localized_name: LocalizedNameSchema,
  artist_type: ArtistTypeSchema,
  // date
  date_of_start: v.optional(v.pipe(v.date(), v.maxValue(new Date()))),
  date_of_start_mask: v.optional(DateMask),
  date_of_end: v.optional(v.pipe(v.date(), v.maxValue(new Date()))),
  date_of_end_mask: v.optional(DateMask),
  // location
  start_location: v.optional(LocationSchema),
  current_location: v.optional(LocationSchema),
  end_location: v.optional(LocationSchema),
  // links
  alias: AliasListSchema,
  member: MemberListSchema,
})

export * from "./init.ts"

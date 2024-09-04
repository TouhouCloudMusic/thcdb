import * as v from "valibot"
import { OptionalIDSchema } from "~/lib/form/schema/id"
import { LocalizedLanguageSchema } from "~/lib/form/schema/language.ts"

export const ArtistNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.nonEmpty("Artist name is required"),
	v.maxLength(128, "Artist name is too long")
)

export const LocalizedNameSchema = v.nullish(
	v.array(
		v.object({
			language: LocalizedLanguageSchema,
			name: ArtistNameSchema,
		})
	)
)

export const ArtistTypeSchema = v.picklist(
	["Person", "Group"],
	"Invalid artist type"
)

export type YearSchema = v.InferInput<typeof YearSchema>
export const YearSchema = v.union(
	[
		v.pipe(v.number(), v.minValue(-1), v.maxValue(new Date().getFullYear())),
		v.null(),
	],
	"Invalid year"
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
		join_year: YearSchema,
		leave_year: YearSchema,
	},
	"Invalid artist"
)

export type MemberListSchema = v.InferInput<typeof MemberListSchema>
export const MemberListSchema = v.optional(v.array(MemberSchema))

export type ArtistFormSchema = v.InferInput<typeof ArtistFormSchema>
export const ArtistFormSchema = v.object({
	id: OptionalIDSchema,
	name: ArtistNameSchema,
	localized_name: LocalizedNameSchema,
	alias: AliasListSchema,
	artist_type: ArtistTypeSchema,
	member: MemberListSchema,
})

export * from "./init.ts"

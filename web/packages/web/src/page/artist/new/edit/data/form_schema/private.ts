import * as v from "valibot"

export const artistTypeSchema = v.picklist(
	["Person", "Group"],
	"Invalid artist type"
)

// possible value: number, NaN, null
export const yearSchema = v.union(
	[
		v.pipe(v.number(), v.minValue(-1), v.maxValue(new Date().getFullYear())),
		v.nan(),
		v.null(),
	],
	"Invalid year"
)

export type ArtistForm = v.InferInput<typeof ArtistFormSchema>
export type MemberList = ArtistForm["member"]
export type MemberListItem = NonNullable<MemberList>[number]
export const ArtistFormSchema = v.object({
	id: v.string(),
	name: v.pipe(
		v.string(),
		v.nonEmpty("Artist name is required"),
		v.maxLength(64, "Artist name is too long")
	),
	artist_type: artistTypeSchema,
	member: v.optional(
		v.array(
			v.object({
				id: v.optional(v.string()),
				name: v.pipe(v.string(), v.minLength(1, "Artist name is required")),
				is_str: v.boolean(),
				// artist_type: artistTypeSchema,
				join_year: yearSchema,
				leave_year: yearSchema,
			}),
			"Invalid artist"
		)
	),
})

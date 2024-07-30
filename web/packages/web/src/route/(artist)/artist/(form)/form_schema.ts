import * as v from "valibot"

export const artistTypeSchema = v.picklist(
	["Person", "Group"],
	"Invalid artist type"
)

export const yearSchema = v.optional(
	v.union(
		[
			v.pipe(
				v.number(),
				v.minValue(-1, "Invalid year"),
				v.maxValue(new Date().getFullYear())
			),
			v.nan(),
		],
		"Invalid year"
	)
)

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
				artist_type: artistTypeSchema,
				is_str: v.boolean(),
				join_year: yearSchema,
				leave_year: yearSchema,
			}),
			"Invalid artist"
		)
	),
})

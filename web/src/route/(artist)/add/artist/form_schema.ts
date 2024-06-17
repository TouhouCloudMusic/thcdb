import * as v from "valibot"

const artistTypeSchema = v.picklist(["Person", "Group"], "Invalid artist type")

const yearSchema = v.nullable(
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
	type: artistTypeSchema,
	member: v.optional(
		v.array(
			v.object({
				artistID: v.string(),
				groupMemberID: v.string(),
				name: v.pipe(v.string(), v.minLength(1, "Artist name is required")),
				type: artistTypeSchema,
				isText: v.boolean(),
				joinYear: yearSchema,
				leaveYear: yearSchema,
			}),
			"Invalid artist"
		)
	),
})

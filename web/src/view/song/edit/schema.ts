import * as v from "valibot"

import { NewCorrection } from "~/domain/shared/schema"
import { NewSong, NewSongRelation } from "~/domain/song"
import {
	ArtistReference,
	CreditRoleReference,
	LanguageReference,
	LocalizedName,
	SongReference,
} from "~/view/entity/schema"

const SongCredit = v.pipe(
	v.object({
		artist: v.message(ArtistReference, "Artist not selected"),
		role: v.optional(CreditRoleReference),
	}),
	v.transform((credit) => ({
		artist_id: credit.artist.id,
		role_id: credit.role?.id,
	})),
)

const SongRelation = v.pipe(
	v.object({
		song: v.message(SongReference, "Related song not selected"),
		direction: NewSongRelation.entries.direction,
		relation_type: NewSongRelation.entries.relation_type,
		description: NewSongRelation.entries.description,
	}),
	v.transform((relation) => ({
		related_song_id: relation.song.id,
		direction: relation.direction,
		relation_type: relation.relation_type,
		description: relation.description,
	})),
)

export const SongFormSchema = NewCorrection(
	v.pipe(
		v.object({
			...NewSong.entries,
			artists: v.array(ArtistReference),
			languages: v.array(
				v.message(
					v.pipe(
						v.undefinedable(LanguageReference),
						v.guard((language) => language !== undefined),
					),
					"Language not selected",
				),
			),
			localized_titles: v.array(LocalizedName),
			credits: v.array(SongCredit),
			relations: v.pipe(
				v.array(SongRelation),
				NewSong.entries.relations.pipe[1],
			),
		}),
		v.transform(({ artists, languages, ...data }) => ({
			...data,
			artists: artists.map((artist) => artist.id),
			languages: languages.map((language) => language.id),
		})),
	),
)

export type SongFormInput = v.InferInput<typeof SongFormSchema>

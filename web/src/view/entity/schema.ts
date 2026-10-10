import * as v from "valibot"

import { EntityId, NewLocalizedName } from "~/domain/shared/schema"
import type {
	CreditRoleRef,
	Language as ApiLanguage,
	SimpleArtist,
	SongRef,
} from "~/hey-api"
import {
	vCreditRoleRef,
	vLanguage,
	vSimpleArtist,
	vSongRef,
} from "~/hey-api/valibot.gen"

interface Artist extends SimpleArtist {
	id: SimpleArtist["id"]
}
const artist = v.object({ ...vSimpleArtist.entries, id: EntityId })
export const ArtistReference = v.custom<Artist>((value) => v.is(artist, value))

interface CreditRole extends CreditRoleRef {
	id: CreditRoleRef["id"]
}
const creditRole = v.object({ ...vCreditRoleRef.entries, id: EntityId })
export const CreditRoleReference = v.custom<CreditRole>((value) =>
	v.is(creditRole, value),
)

interface Language extends ApiLanguage {
	id: ApiLanguage["id"]
}
const languageSchema = v.object({ ...vLanguage.entries, id: EntityId })
export const LanguageReference = v.custom<Language>((value) =>
	v.is(languageSchema, value),
)

interface Song extends SongRef {
	id: SongRef["id"]
}
const song = v.object({ ...vSongRef.entries, id: EntityId })
export const SongReference = v.custom<Song>((value) => v.is(song, value))

export const LocalizedName = v.pipe(
	v.object({
		language: v.message(LanguageReference, "Language not selected"),
		name: NewLocalizedName.entries.name,
	}),
	v.transform(({ language, name }) => ({ language_id: language.id, name })),
)

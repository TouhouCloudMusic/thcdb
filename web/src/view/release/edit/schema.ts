import * as v from "valibot"

import {
	CatalogNumber,
	NewCredit,
	NewLocalizedTitle,
	NewRelease,
	NewTrack,
} from "~/domain/release"
import { EntityId, NewCorrection } from "~/domain/shared/schema"
import type { SimpleEvent, SimpleLabel } from "~/hey-api"
import { vSimpleEvent, vSimpleLabel } from "~/hey-api/valibot.gen"
import {
	ArtistReference,
	CreditRoleReference,
	LanguageReference,
	SongReference,
} from "~/view/entity/schema"

interface Event extends SimpleEvent {
	id: SimpleEvent["id"]
}
const eventSchema = v.object({ ...vSimpleEvent.entries, id: EntityId })
const EventReference = v.custom<Event>((value) => v.is(eventSchema, value))

interface Label extends SimpleLabel {
	id: SimpleLabel["id"]
}
const labelSchema = v.object({ ...vSimpleLabel.entries, id: EntityId })
const LabelReference = v.custom<Label>((value) => v.is(labelSchema, value))

const localizedTitleSchema = v.pipe(
	v.object({
		...v.omit(NewLocalizedTitle, ["language_id"]).entries,
		language: LanguageReference,
	}),
	v.transform(({ language, ...title }) => ({
		...title,
		language_id: language.id,
	})),
)

const catalogNumberSchema = v.pipe(
	v.object({
		...v.omit(CatalogNumber, ["label_id"]).entries,
		label: v.optional(LabelReference),
	}),
	v.transform(({ label, ...catalog }): CatalogNumber => ({
		...catalog,
		label_id: label?.id,
	})),
)

const creditSchema = v.pipe(
	v.object({
		...v.omit(NewCredit, ["artist_id", "role_id"]).entries,
		artist: ArtistReference,
		role: CreditRoleReference,
	}),
	v.transform(({ artist, role, ...credit }) => ({
		...credit,
		artist_id: artist.id,
		role_id: role.id,
	})),
)

const trackSchema = v.pipe(
	v.object({
		...v.omit(NewTrack, ["song_id", "artists"]).entries,
		song: SongReference,
		artists: v.array(ArtistReference),
	}),
	v.transform(({ song, artists, ...track }) => ({
		...track,
		song_id: song.id,
		artists: artists.map((artist) => artist.id),
	})),
)

const release = v.pipe(
	v.object({
		...NewRelease.pipe[0].entries,
		artists: v.pipe(
			v.array(ArtistReference),
			v.transform((artists) => artists.map((artist) => artist.id)),
			NewRelease.pipe[0].entries.artists.pipe[1],
		),
		events: v.pipe(
			v.array(EventReference),
			v.transform((events) => events.map((event) => event.id)),
		),
		localized_titles: v.array(localizedTitleSchema),
		catalog_nums: v.array(catalogNumberSchema),
		credits: v.array(creditSchema),
		tracks: v.array(trackSchema),
	}),
	NewRelease.pipe[1],
)

export const ReleaseFormSchema = NewCorrection(release)
export type ReleaseFormInput = v.InferInput<typeof ReleaseFormSchema>

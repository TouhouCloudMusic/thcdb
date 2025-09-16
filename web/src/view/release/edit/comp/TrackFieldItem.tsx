import { Field, remove, setInput } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { ReleaseTrack, SimpleArtist, Song } from "@thc/api"
import { For } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, Pencil1Icon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import { SongSearchDialog } from "../comp/SongSearchDialog"
import { ArtistInfo, SongInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

export function TrackItem(props: {
	index: number
	of: ReleaseFormStore
	initTrack?: ReleaseTrack
}) {
	const [track, setTrack] = createStore({
		song: props.initTrack?.song,
		artists: props.initTrack?.artists ?? [],
	})

	const onRemoveTrack = () =>
		remove(props.of, { path: ["data", "tracks"], at: props.index })
	const onSelectSong = (s: Song) => {
		setTrack("song", s)
		setInput(props.of, {
			path: ["data", "tracks", props.index, "song_id"],
			input: s.id,
		})
	}
	const hasArtist = (a: SimpleArtist) =>
		track.artists.some((x) => x.id === a.id)
	const onAddArtist = (a: SimpleArtist) => {
		if (hasArtist(a)) return
		setTrack("artists", track.artists.length, a)
		const nextIds = [...track.artists.map((x) => x.id), a.id]
		setInput(props.of, {
			path: ["data", "tracks", props.index, "artists"],
			input: nextIds,
		})
	}
	const onRemoveArtistAt = (idx: number) => () => {
		const next = track.artists.toSpliced(idx, 1)
		setTrack("artists", next)
		setInput(props.of, {
			path: ["data", "tracks", props.index, "artists"],
			input: next.map((x) => x.id),
		})
	}

	return (
		<>
			<div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
				<TrackNumInput
					index={props.index}
					of={props.of}
				/>
				<DurationInput
					index={props.index}
					of={props.of}
				/>
				<RemoveTrackButton onRemove={onRemoveTrack} />
			</div>
			<DisplayTitleInput
				index={props.index}
				of={props.of}
			/>
			<TrackSongPicker
				index={props.index}
				of={props.of}
				song={() => track.song}
				onSelect={onSelectSong}
			/>
			<TrackArtistsField
				artists={track.artists}
				onAdd={onAddArtist}
				onRemoveAt={onRemoveArtistAt}
				hasArtist={hasArtist}
			/>
		</>
	)
}

function TrackNumInput(props: { index: number; of: ReleaseFormStore }) {
	return (
		<Field
			of={props.of}
			path={["data", "tracks", props.index, "track_number"]}
		>
			{(field) => (
				<InputField.Root>
					<InputField.Input
						{...field.props}
						placeholder="Track number"
						value={field.input ?? undefined}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}

function DisplayTitleInput(props: { index: number; of: ReleaseFormStore }) {
	return (
		<Field
			of={props.of}
			path={["data", "tracks", props.index, "display_title"]}
		>
			{(field) => (
				<InputField.Root>
					<InputField.Input
						{...field.props}
						placeholder="Display title"
						value={field.input ?? undefined}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}

function DurationInput(props: { index: number; of: ReleaseFormStore }) {
	return (
		<Field
			of={props.of}
			path={["data", "tracks", props.index, "duration"]}
		>
			{(field) => (
				<InputField.Root>
					<InputField.Input
						{...field.props}
						class="no-spinner"
						type="number"
						placeholder="Duration (ms)"
						value={field.input ?? undefined}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}

function TrackSongPicker(props: {
	index: number
	of: ReleaseFormStore
	song: () => Song | undefined
	onSelect: (s: Song) => void
}) {
	return (
		<div class="grid grid-cols-[1fr_auto] items-center gap-2 pl-1">
			<Field
				of={props.of}
				path={["data", "tracks", props.index, "song_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>
						<div class="text-slate-700">
							{props.song() ? (
								<SongInfo value={props.song()!} />
							) : (
								<span class="text-slate-400">No song selected</span>
							)}
						</div>
						<For each={field.errors}>
							{(error) => (
								<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
							)}
						</For>
					</>
				)}
			</Field>
			<SongSearchDialog
				onSelect={props.onSelect}
				icon={<Pencil1Icon />}
			/>
		</div>
	)
}

function RemoveTrackButton(props: { onRemove: () => void }) {
	return (
		<Button
			variant="Tertiary"
			size="Sm"
			onClick={props.onRemove}
		>
			<Cross1Icon />
		</Button>
	)
}

function TrackArtistsField(props: {
	artists: SimpleArtist[]
	onAdd: (a: SimpleArtist) => void
	onRemoveAt: (i: number) => () => void
	hasArtist: (a: SimpleArtist) => boolean
}) {
	return (
		<div class="flex flex-col gap-2 pl-1">
			<div class="flex items-center justify-between gap-2">
				<FormComp.Label class="m-0">
					<Trans>Track Artists</Trans>
				</FormComp.Label>
				<ArtistSearchDialog
					onSelect={props.onAdd}
					dataFilter={(a: SimpleArtist) => !props.hasArtist(a)}
				/>
			</div>

			<ul class="flex flex-col gap-1">
				<For each={props.artists}>
					{(artist, idx) => (
						<li class="grid grid-cols-[1fr_auto] gap-2">
							<ArtistInfo value={artist} />
							<Button
								variant="Tertiary"
								size="Sm"
								onClick={props.onRemoveAt(idx())}
							>
								<Cross1Icon />
							</Button>
						</li>
					)}
				</For>
			</ul>
		</div>
	)
}

import { Field, remove, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { ReleaseTrack, SimpleArtist, Song } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import {
	ArtistSearchDialog,
	SongSearchDialog,
} from "~/component/form/SearchDialog"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { ArtistInfo, SongInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	trackFields: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		gap: px[8],
	},
	trackNumber: {
		appearance: "textfield",
		"::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
		"::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
	},
	songPicker: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
		gap: px[8],
		paddingLeft: px[4],
	},
	songName: { color: palette.slate[700] },
	placeholder: { color: palette.slate[400] },
	artists: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		paddingLeft: px[4],
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[8],
	},
	label: { margin: "0rem" },
	icon: { width: px[16], height: px[16], color: palette.slate[600] },
	list: { display: "flex", flexDirection: "column", gap: px[4] },
	artist: { display: "grid", gridTemplateColumns: "1fr auto", gap: px[8] },
})

export function TrackItem(props: {
	index: number
	of: ReleaseFormStore
	initTrack?: ReleaseTrack
}) {
	const [track, setTrack] = createStore(
		untrack(() => ({
			song: props.initTrack?.song,
			artists: props.initTrack?.artists ?? [],
		})),
	)

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
	const onRemoveArtistAt = (idx: number) => {
		const next = track.artists.toSpliced(idx, 1)
		setTrack("artists", next)
		setInput(props.of, {
			path: ["data", "tracks", props.index, "artists"],
			input: next.map((x) => x.id),
		})
	}

	return (
		<>
			<div {...stylex.attrs(styles.trackFields)}>
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
	const { t } = useLingui()
	return (
		<Field
			of={props.of}
			path={["data", "tracks", props.index, "track_number"]}
		>
			{(field) => (
				<InputField.Root>
					<InputField.Input
						{...field.props}
						placeholder={t`Track number`}
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
	const { t } = useLingui()
	return (
		<Field
			of={props.of}
			path={["data", "tracks", props.index, "display_title"]}
		>
			{(field) => (
				<InputField.Root>
					<InputField.Input
						{...field.props}
						placeholder={t`Display title`}
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
	const { t } = useLingui()
	return (
		<Field
			of={props.of}
			path={["data", "tracks", props.index, "duration"]}
		>
			{(field) => (
				<InputField.Root>
					<InputField.Input
						{...field.props}
						styles={styles.trackNumber}
						type="number"
						placeholder={t`Duration (ms)`}
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
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.songPicker)}>
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
						<div {...stylex.attrs(styles.songName)}>
							{props.song() ? (
								<SongInfo value={props.song()!} />
							) : (
								<span
									{...stylex.attrs(styles.placeholder)}
								>{t`No song selected`}</span>
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
			onClick={props.onRemove}
			appearance="ghost"
			tone="gray"
			size="sm"
		>
			<Cross1Icon />
		</Button>
	)
}

function TrackArtistsField(props: {
	artists: SimpleArtist[]
	onAdd: (a: SimpleArtist) => void
	onRemoveAt: (i: number) => void
	hasArtist: (a: SimpleArtist) => boolean
}) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.artists)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Track Artists`}</label>
				<ArtistSearchDialog
					onSelect={props.onAdd}
					dataFilter={(a: SimpleArtist) => !props.hasArtist(a)}
					icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
				/>
			</div>

			<ul {...stylex.attrs(styles.list)}>
				<For each={props.artists}>
					{(artist, idx) => (
						<li {...stylex.attrs(styles.artist)}>
							<ArtistInfo value={artist} />
							<Button
								onClick={() => props.onRemoveAt(idx())}
								appearance="ghost"
								tone="gray"
								size="sm"
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

import { useField } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { SimpleArtist, SongRef } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

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

import { removeTrack } from "../model"
import type { ReleaseTracksModel } from "../model"
import { entityInfoStyles } from "./entityInfo.stylex"
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
	model: ReleaseTracksModel
}) {
	const { t } = useLingui()
	const trackNumber = useField(
		() => props.of,
		() => ({
			path: ["data", "tracks", props.index, "track_number"],
		}),
	)

	const duration = useField(
		() => props.of,
		() => ({
			path: ["data", "tracks", props.index, "duration"],
		}),
	)

	const displayTitle = useField(
		() => props.of,
		() => ({
			path: ["data", "tracks", props.index, "display_title"],
		}),
	)

	const song = useField(
		() => props.of,
		() => ({
			path: ["data", "tracks", props.index, "song"],
		}),
	)

	const artists = useField(
		() => props.of,
		() => ({
			path: ["data", "tracks", props.index, "artists"],
		}),
	)

	const onRemoveTrack = () => removeTrack(props.of, props.index)
	const canAddArtist = (artist: SimpleArtist) =>
		!props.model.hasArtist(artists, artist.id)
	const onAddArtist = (artist: SimpleArtist) =>
		props.model.addArtist(artists, artist)
	const onRemoveArtist = (id: number) => props.model.removeArtist(artists, id)

	return (
		<>
			<div {...stylex.attrs(styles.trackFields)}>
				<InputField.Root>
					<InputField.Input
						{...trackNumber.props}
						placeholder={t`Track number`}
						value={trackNumber.input ?? undefined}
					/>
					<InputField.Error>{trackNumber.errors?.[0]}</InputField.Error>
				</InputField.Root>
				<InputField.Root>
					<InputField.Input
						{...duration.props}
						styles={styles.trackNumber}
						type="number"
						placeholder={t`Duration (ms)`}
						value={duration.input ?? undefined}
					/>
					<InputField.Error>{duration.errors?.[0]}</InputField.Error>
				</InputField.Root>
				<Button
					onClick={onRemoveTrack}
					appearance="ghost"
					tone="gray"
					size="sm"
				>
					<Cross1Icon />
				</Button>
			</div>
			<InputField.Root>
				<InputField.Input
					{...displayTitle.props}
					placeholder={t`Display title`}
					value={displayTitle.input ?? undefined}
				/>
				<InputField.Error>{displayTitle.errors?.[0]}</InputField.Error>
			</InputField.Root>
			<TrackSongPicker
				song={song.input}
				onSelect={song.onInput}
			/>
			<For each={song.errors}>
				{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
			</For>
			<TrackArtistsField
				artists={artists.input}
				onAdd={onAddArtist}
				onRemove={onRemoveArtist}
				canAddArtist={canAddArtist}
			/>
		</>
	)
}

function TrackSongPicker(props: {
	song?: SongRef
	onSelect: (s: SongRef) => void
}) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.songPicker)}>
			<div {...stylex.attrs(styles.songName)}>
				<Show
					when={props.song}
					fallback={
						<span
							{...stylex.attrs(styles.placeholder)}
						>{t`No song selected`}</span>
					}
				>
					<span {...stylex.attrs(entityInfoStyles.name)}>
						{props.song?.title}
					</span>
				</Show>
			</div>
			<SongSearchDialog
				onSelect={props.onSelect}
				icon={<Pencil1Icon />}
			/>
		</div>
	)
}

function TrackArtistsField(props: {
	artists: SimpleArtist[]
	onAdd: (a: SimpleArtist) => void
	onRemove: (id: number) => void
	canAddArtist: (a: SimpleArtist) => boolean
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
					filter={props.canAddArtist}
					icon={<PlusIcon {...stylex.attrs(styles.icon)} />}
				/>
			</div>

			<ul {...stylex.attrs(styles.list)}>
				<For each={props.artists}>
					{(artist) => (
						<li {...stylex.attrs(styles.artist)}>
							<span {...stylex.attrs(entityInfoStyles.name)}>
								{artist.name}
							</span>
							<Button
								onClick={() => props.onRemove(artist.id)}
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

import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Release, ReleaseArtist, ReleaseTrack } from "@thc/api"
import { For, Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { Duration } from "~/domain/shared"
import { link } from "~/style/link"
import { dividerStyles } from "~/style/primitives"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	track: {
		gridColumn: "1 / -1",
		display: "grid",
		gridTemplateColumns: "subgrid",
		alignItems: "last baseline",
		gap: px[16],
	},
	number: {
		textAlign: "right",
		letterSpacing: "-0.05em",
		fontVariantNumeric: "tabular-nums",
	},
	separator: { whiteSpace: "pre" },
	artists: {
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	duration: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		fontVariantNumeric: "tabular-nums",
	},
	tracks: {
		display: "grid",
		gridTemplateColumns: "auto minmax(0,1fr) auto",
		rowGap: px[4],
		fontWeight: 300,
	},
	divider: { gridColumn: "1 / -1" },
	discTitle: { marginBottom: px[8], letterSpacing: "-0.025em" },
})

function TrackItem(props: { track: ReleaseTrack }) {
	return (
		<li {...stylex.attrs(styles.track)}>
			<span {...stylex.attrs(styles.number)}>{props.track.track_number}</span>
			<div>
				<Link
					class={stylex.attrs(link.base, link.text).class}
					to="/song/$id"
					params={{ id: props.track.song.id.toString() }}
				>
					{props.track.display_title ?? props.track.song.title}
				</Link>
				<Show when={props.track.artists && props.track.artists.length > 0}>
					<span {...stylex.attrs(styles.separator)}> - </span>
					<div {...stylex.attrs(styles.artists)}>
						{props.track
							.artists!.map((artist: ReleaseArtist) => artist.name)
							.join(", ")}
					</div>
				</Show>
			</div>
			<Show
				when={props.track.duration}
				fallback={<span></span>}
			>
				<span {...stylex.attrs(styles.duration)}>
					{Duration.format(props.track.duration)}
				</span>
			</Show>
		</li>
	)
}
function TrackList(props: { tracks?: ReleaseTrack[] }) {
	return (
		<Show when={props.tracks}>
			<ul {...stylex.attrs(styles.tracks)}>
				<Intersperse
					of={props.tracks}
					with={
						<span
							{...stylex.attrs(dividerStyles.horizontal, styles.divider)}
						></span>
					}
				>
					{(track) => <TrackItem track={track} />}
				</Intersperse>
			</ul>
		</Show>
	)
}

type ReleaseInfoTracksProps = {
	discs?: Release["discs"] | null
	tracks?: ReleaseTrack[] | null
}

export function ReleaseInfoTracks(props: ReleaseInfoTracksProps) {
	return (
		<Show
			when={props.discs && props.discs.length > 0 && props.discs[0]?.name}
			fallback={<TrackList tracks={props.tracks ?? undefined} />}
		>
			<For each={props.discs}>
				{(disc, index) => (
					<div>
						<h4 {...stylex.attrs(styles.discTitle)}>
							{disc.name ?? `Disc ${index() + 1}`}
						</h4>
						<TrackList
							tracks={props.tracks?.filter((track) => track.disc_id == disc.id)}
						/>
					</div>
				)}
			</For>
		</Show>
	)
}

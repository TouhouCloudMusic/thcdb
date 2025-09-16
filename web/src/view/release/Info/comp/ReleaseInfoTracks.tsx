import type { ReleaseArtist, ReleaseTrack } from "@thc/api"
import { For, Show } from "solid-js"

import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import { Duration } from "~/domain/shared"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

function TrackItem(props: { track: ReleaseTrack }) {
	return (
		<li class="col-span-full grid grid-cols-subgrid items-baseline-last gap-4">
			<span class="text-right tracking-tighter tabular-nums">
				{props.track.track_number}
			</span>
			<div>
				<div>{props.track.display_title || props.track.song.title}</div>
				<Show when={props.track.artists && props.track.artists.length > 0}>
					<span class="whitespace-pre"> - </span>
					<div class="text-gray-600 text-sm">
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
				<span class="text-sm font-light tabular-nums">
					{Duration.format(props.track.duration)}
				</span>
			</Show>
		</li>
	)
}
function TrackList(props: { tracks?: ReleaseTrack[] }) {
	return (
		<Show when={props.tracks}>
			<ul class="grid grid-cols-[auto_1fr_auto] gap-y-1 font-light">
				<Intersperse
					of={props.tracks}
					with={
						<Divider
							horizontal
							class="col-span-full"
						/>
					}
				>
					{(track) => <TrackItem track={track} />}
				</Intersperse>
			</ul>
		</Show>
	)
}

export function ReleaseInfoTracks() {
	const ctx = assertContext(ReleaseInfoPageContext)
	return (
		<Show
			when={
				ctx.release.discs
				&& ctx.release.discs.length > 0
				&& ctx.release.discs[0]?.name
			}
			fallback={<TrackList tracks={ctx.release.tracks} />}
		>
			<For each={ctx.release.discs}>
				{(disc, index) => (
					<div>
						<h4 class="mb-2 tracking-tight">
							{disc.name ?? `Disc ${index() + 1}`}
						</h4>
						<TrackList
							tracks={ctx.release.tracks?.filter((t) => t.disc_id == disc.id)}
						/>
					</div>
				)}
			</For>
		</Show>
	)
}

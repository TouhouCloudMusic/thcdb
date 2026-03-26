import type { Song } from "@thc/api"
import { For, Show } from "solid-js"

import { Link } from "~/component/atomic"

type SongItemProps = {
	song: Song
	locale: string
}

export function SongItem(props: SongItemProps) {
	const localizedTitle = () =>
		props.song.localized_titles?.find(
			(value) => value.language.code === props.locale,
		)?.title

	const displayTitle = () => localizedTitle() ?? props.song.title
	const originalTitle = () => (localizedTitle() ? props.song.title : undefined)
	const artists = () => props.song.artists ?? []

	return (
		<div class="border-b border-slate-200 py-3 last:border-b-0">
			<div class="flex min-w-0 items-baseline gap-2">
				<Link
					to="/song/$id"
					params={{ id: props.song.id.toString() }}
					class="truncate text-slate-900 no-underline hover:underline"
				>
					{displayTitle()}
				</Link>
				<Show when={originalTitle()}>
					<span class="truncate text-sm text-slate-400">{originalTitle()}</span>
				</Show>
			</div>

			<Show when={artists().length > 0}>
				<div class="mt-1 text-sm text-slate-500">
					<For each={artists()}>
						{(artist, idx) => (
							<>
								<Link
									to="/artist/$id"
									params={{ id: artist.id.toString() }}
									class="text-slate-500 no-underline hover:underline"
								>
									{artist.name}
								</Link>
								<Show when={idx() < artists().length - 1}>
									<span class="text-slate-300">, </span>
								</Show>
							</>
						)}
					</For>
				</div>
			</Show>
		</div>
	)
}

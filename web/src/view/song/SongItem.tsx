import { useLingui } from "@lingui/solid/macro"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { Link } from "~/component/atomic"
import type { SongListItem } from "~/hey-api"
import { imgUrl } from "~/utils/adapter/static_file"

export function SongItem(props: { song: SongListItem }) {
	const { t } = useLingui()

	return (
		<div class="grid grid-cols-[3lh_minmax(0,1fr)] items-start gap-3 leading-6">
			<Thumbnail
				src={imgUrl(props.song.cover_art_url)}
				to="/song/$id"
				params={{ id: props.song.id.toString() }}
				aria-label={props.song.title}
				class="relative aspect-square overflow-hidden rounded-sm no-underline focus-visible:ring-2"
				imageClass="absolute inset-0 size-full object-cover"
			/>

			<div>
				<Link
					to="/song/$id"
					params={{ id: props.song.id.toString() }}
					class="wrap-break-word text-base no-underline"
				>
					{props.song.title}
				</Link>

				<Show when={props.song.releases.length > 0}>
					<div class="mt-1 flex gap-x-1 text-sm text-tertiary">
						<span class="shrink-0">{t`Appears on`}</span>
						<span class="min-w-0 wrap-break-word">
							<For each={props.song.releases}>
								{(release, index) => (
									<>
										<Link
											to="/release/$id"
											params={{ id: release.id.toString() }}
											class="text-secondary no-underline"
										>
											{release.title}
										</Link>
										<Show when={index() < props.song.releases.length - 1}>
											{", "}
										</Show>
									</>
								)}
							</For>
						</span>
					</div>
				</Show>

				<Show when={props.song.artists.length > 0}>
					<div class="mt-1 flex gap-x-1 text-sm text-tertiary">
						<span class="shrink-0">{t`By`}</span>
						<span class="min-w-0 wrap-break-word">
							<For each={props.song.artists}>
								{(artist, index) => (
									<>
										<Link
											to="/artist/$id"
											params={{ id: artist.id.toString() }}
											class="text-secondary no-underline"
										>
											{artist.name}
										</Link>
										<Show when={index() < props.song.artists.length - 1}>
											{", "}
										</Show>
									</>
								)}
							</For>
						</span>
					</div>
				</Show>
			</div>
		</div>
	)
}

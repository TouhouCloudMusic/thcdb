import { useLingui } from "@lingui/solid/macro"
import { Link as RouterLink } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { Link } from "~/component/atomic"
import { DateWithPrecision } from "~/domain/shared"
import type { ReleaseListItem } from "~/hey-api"
import { imgUrl } from "~/utils/adapter/static_file"

function ReleaseArtists(props: { release: ReleaseListItem }) {
	const { t } = useLingui()

	return (
		<Show when={props.release.artists.length > 0}>
			<div class="flex gap-x-1 text-sm text-tertiary">
				<span class="shrink-0">{t`By`}</span>
				<span class="min-w-0 wrap-break-word">
					<For each={props.release.artists}>
						{(artist, index) => (
							<>
								<Link
									to="/artist/$id"
									params={{ id: artist.id.toString() }}
									class="text-secondary no-underline"
								>
									{artist.name}
								</Link>
								<Show when={index() < props.release.artists.length - 1}>
									{", "}
								</Show>
							</>
						)}
					</For>
				</span>
			</div>
		</Show>
	)
}

function ReleaseMeta(props: { release: ReleaseListItem }) {
	const releaseDate = () =>
		DateWithPrecision.display(props.release.release_date)

	return (
		<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-tertiary">
			<span>{props.release.release_type}</span>
			<Show when={releaseDate()}>{(date) => <span>{date()}</span>}</Show>
			<Show when={props.release.catalog_numbers.length > 0}>
				<span>#{props.release.catalog_numbers.join(" / #")}</span>
			</Show>
		</div>
	)
}

export function ReleaseGridItem(props: { release: ReleaseListItem }) {
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<div>
			<RouterLink
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				class="block aspect-square overflow-hidden rounded-sm bg-secondary no-underline focus-visible:ring-2 focus-visible:ring-slate-200"
				aria-label={props.release.title}
			>
				<Show when={coverUrl()}>
					{(src) => (
						<img
							src={src()}
							alt=""
							class="size-full object-cover"
							loading="lazy"
						/>
					)}
				</Show>
			</RouterLink>

			<div class="mt-2 space-y-1">
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class="block wrap-break-word text-sm no-underline"
				>
					{props.release.title}
				</Link>
				<ReleaseArtists release={props.release} />
				<ReleaseMeta release={props.release} />
			</div>
		</div>
	)
}

export function ReleaseItem(props: { release: ReleaseListItem }) {
	return (
		<div class="grid grid-cols-[3lh_minmax(0,1fr)] items-start gap-3 leading-6">
			<Thumbnail
				src={imgUrl(props.release.cover_art_url)}
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				aria-label={props.release.title}
				class="relative aspect-square overflow-hidden rounded-sm no-underline focus-visible:ring-2"
				imageClass="absolute inset-0 size-full object-cover"
			/>

			<div class="flex flex-col gap-1">
				<Link
					to="/release/$id"
					params={{ id: props.release.id.toString() }}
					class="wrap-break-word text-base no-underline"
				>
					{props.release.title}
				</Link>
				<ReleaseArtists release={props.release} />
				<ReleaseMeta release={props.release} />
			</div>
		</div>
	)
}

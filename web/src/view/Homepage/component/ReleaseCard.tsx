import type { Release } from "@thc/api"
import { Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { displayReleaseDate, formatArtists } from "~/view/Homepage/utils"

type ReleaseCardProps = {
	release: Release
}

const ReleaseCard = (props: ReleaseCardProps) => {
	const artistsLabel = () => formatArtists(props.release.artists)
	const releaseDate = () => displayReleaseDate(props.release.release_date)
	const coverUrl = () => props.release.cover_art_url ?? undefined

	return (
		<Card class="rounded-none border border-slate-300 p-0 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0">
			<div class="flex h-full flex-col overflow-hidden">
				<Show
					when={coverUrl()}
					fallback={
						<div class="grid aspect-[4/3] place-items-center bg-slate-100 text-xs text-tertiary ring-1 ring-slate-200 ring-inset">
							No cover
						</div>
					}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="aspect-[4/3] w-full bg-slate-100 object-cover"
						/>
					)}
				</Show>

				<div class="flex flex-1 flex-col gap-2 p-4">
					<div class="flex items-start justify-between gap-3">
						<Link
							to="/release/$id"
							params={{ id: props.release.id.toString() }}
							class="block min-w-0 no-underline hover:no-underline"
						>
							<div class="truncate text-sm font-medium text-primary">
								{props.release.title}
							</div>
							<div class="mt-1 truncate text-xs text-tertiary">
								{artistsLabel()}
							</div>
						</Link>
						<div class="shrink-0 text-xs text-tertiary">
							<Show when={releaseDate()}>{(d) => <span>{d()}</span>}</Show>
						</div>
					</div>

					<div class="mt-auto flex items-center gap-3">
						<div class="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-secondary ring-1 ring-slate-200 ring-inset">
							{props.release.release_type}
						</div>
					</div>
				</div>
			</div>
		</Card>
	)
}

export { ReleaseCard }

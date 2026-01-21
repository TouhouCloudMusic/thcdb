import type { Artist } from "@thc/api"
import { For, Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"

type LatestArtistsCardProps = {
	artists: Artist[]
}

type ArtistTileProps = {
	artist: Artist
}

const ArtistTile = (props: ArtistTileProps) => {
	const avatarUrl = () => props.artist.profile_image_url ?? undefined
	const initials = () => props.artist.name.trim().slice(0, 1).toUpperCase()

	return (
		<Link
			to="/artist/$id"
			params={{ id: props.artist.id.toString() }}
			class="group block no-underline hover:no-underline"
		>
			<Card class="relative flex flex-col items-center gap-3 rounded-none border border-slate-200 bg-white/70 p-3 shadow-xs ring-1 ring-white/70 ring-inset transition-all duration-150 hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white/85 hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0">
				<div class="absolute right-2 top-2 font-mono text-[10px] text-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none">
					→
				</div>

				<div class="w-full rounded-full bg-white p-1 shadow-xs ring-1 ring-slate-200 ring-inset">
					<Show
						when={avatarUrl()}
						fallback={
							<div class="grid aspect-square w-full place-items-center rounded-full bg-gradient-to-br from-reimu-100 to-marisa-100 text-sm font-semibold tracking-wide text-secondary">
								{initials()}
							</div>
						}
					>
						{(src) => (
							<img
								src={src()}
								alt=""
								loading="lazy"
								class="aspect-square w-full rounded-full bg-slate-100 object-cover"
							/>
						)}
					</Show>
				</div>

				<div class="flex w-full flex-col items-center gap-1">
					<div class="text-center text-xs font-medium leading-snug text-primary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">
						{props.artist.name}
					</div>
					<div class="text-[10px] text-tertiary">
						{props.artist.artist_type}
					</div>
				</div>
			</Card>
		</Link>
	)
}

const LatestArtistsCard = (props: LatestArtistsCardProps) => (
	<Card class="relative overflow-hidden bg-transparent p-0 shadow-none">
		<ExploreSection
			title="Latest Artists"
			to="/artist/explore"
		>
			<div class="grid grid-cols-3 gap-3">
				<For each={props.artists.slice(0, 6)}>
					{(artist) => <ArtistTile artist={artist} />}
				</For>
			</div>
		</ExploreSection>
	</Card>
)

export { LatestArtistsCard }

import { useLingui } from "@lingui/solid/macro"
import type { Artist } from "@thc/api"
import { For, Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { tw } from "~/utils"
import { ArtistCard } from "~/view/Homepage/component/ArtistCard"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { ARTISTS_LIMIT } from "~/view/Homepage/constants"

const ARTISTS_GRID_CLASS = tw(`
	grid grid-cols-2 gap-0.5
	sm:grid-cols-3
`)

function ArtistTileSkeleton() {
	return (
		<Card class="flex flex-col rounded-none p-3 shadow-none animate-pulse motion-reduce:animate-none">
			<div class="aspect-square w-full rounded-full bg-slate-100"></div>

			<div class="flex flex-1 flex-col justify-between gap-1 pt-2">
				<div class="h-3.5 w-4/5 rounded bg-slate-200"></div>
				<div class="h-3 w-2/5 rounded bg-slate-100"></div>
			</div>
		</Card>
	)
}

function ArtistsGridSkeleton() {
	return (
		<div class={ARTISTS_GRID_CLASS}>
			<For each={Array.from({ length: ARTISTS_LIMIT })}>
				{() => <ArtistTileSkeleton />}
			</For>
		</div>
	)
}

function ArtistsGrid(props: { artists: Artist[] }) {
	return (
		<Show
			when={props.artists.length > 0}
			fallback={<HomeEmptySlot class="h-36" />}
		>
			<div class={ARTISTS_GRID_CLASS}>
				<For each={props.artists}>
					{(artist) => <ArtistCard artist={artist} />}
				</For>
			</div>
		</Show>
	)
}

export function ArtistsCardSkeleton() {
	const { t } = useLingui()
	return (
		<ExploreSection
			title={t`Latest Artists`}
			to="/artist/explore"
		>
			<ArtistsGridSkeleton />
		</ExploreSection>
	)
}

export function ArtistsCard(props: { artists: Artist[] }) {
	const { t } = useLingui()
	return (
		<ExploreSection
			title={t`Latest Artists`}
			to="/artist/explore"
		>
			<ArtistsGrid artists={props.artists} />
		</ExploreSection>
	)
}

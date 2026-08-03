import { useLingui } from "@lingui/solid/macro"
import type { Artist, Event, HomeMetadata, Release, Tag } from "@thc/api"
import { ErrorBoundary, For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { PageLayout } from "~/layout/PageLayout"
import {
	ArtistsCard,
	ArtistsCardSkeleton,
} from "~/view/Homepage/component/ArtistsCard"
import {
	EventsCard,
	EventsCardSkeleton,
} from "~/view/Homepage/component/EventsCard"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { HomeStats } from "~/view/Homepage/component/HomeStats"
import { ReleaseCard } from "~/view/Homepage/component/ReleaseCard"
import { TagsCard, TagsCardSkeleton } from "~/view/Homepage/component/TagsCard"
import { RELEASES_LIMIT } from "~/view/Homepage/constants"

function ReleaseCardSkeleton() {
	return (
		<Card class="flex aspect-[1/1.309] flex-col overflow-hidden rounded-none p-0 shadow-none animate-pulse motion-reduce:animate-none">
			<div class="aspect-square w-full shrink-0 bg-slate-100"></div>
			<div class="grid min-h-0 flex-1 grid-rows-2 p-1">
				<div class="flex items-center justify-between gap-2">
					<div class="h-5 w-3/4 rounded bg-slate-200"></div>
					<div class="h-3 w-10 rounded bg-slate-100"></div>
				</div>

				<div class="flex items-center justify-between gap-3 self-end">
					<div class="h-3 w-1/2 rounded bg-slate-100"></div>
					<div class="h-3 w-12 rounded bg-slate-100"></div>
				</div>
			</div>
		</Card>
	)
}

const RELEASES_GRID_CLASS = "grid gap-0.5 sm:grid-cols-2 xl:grid-cols-3"

function ReleasesGridSkeleton() {
	return (
		<div class={RELEASES_GRID_CLASS}>
			<For each={Array.from({ length: RELEASES_LIMIT })}>
				{() => <ReleaseCardSkeleton />}
			</For>
		</div>
	)
}

function ReleasesGrid(props: { releases: Release[] }) {
	return (
		<Show
			when={props.releases.length > 0}
			fallback={<HomeEmptySlot class="h-56" />}
		>
			<div class={RELEASES_GRID_CLASS}>
				<For each={props.releases}>
					{(release) => <ReleaseCard release={release} />}
				</For>
			</div>
		</Show>
	)
}

type HomePageProps = {
	metadata?: HomeMetadata
	releases: Release[]
	artists: Artist[]
	events: Event[]
	tags: Tag[]
}

export function HomePage(props: HomePageProps) {
	const { t } = useLingui()
	return (
		<PageLayout class="max-w-360 2xl:max-w-360">
			<Suspense fallback={<HomeStats />}>
				<ErrorBoundary fallback={() => <HomeStats />}>
					<HomeStats metadata={props.metadata} />
				</ErrorBoundary>
			</Suspense>

			<section class="grid gap-x-8 gap-y-6 px-8 pt-4 pb-8 lg:grid-cols-[1.35fr_0.65fr]">
				<ExploreSection
					title={t`Latest Releases`}
					to="/release/explore"
				>
					<Suspense fallback={<ReleasesGridSkeleton />}>
						<ReleasesGrid releases={props.releases} />
					</Suspense>
					<Suspense fallback={<ArtistsCardSkeleton />}>
						<ArtistsCard artists={props.artists} />
					</Suspense>
				</ExploreSection>

				<div class="flex flex-col gap-8">
					<Suspense fallback={<EventsCardSkeleton />}>
						<EventsCard events={props.events} />
					</Suspense>
					<Suspense fallback={<TagsCardSkeleton />}>
						<TagsCard tags={props.tags} />
					</Suspense>
				</div>
			</section>
		</PageLayout>
	)
}

import { useLingui } from "@lingui/solid/macro"
import type { Artist, Event, HomeMetadata, Release } from "@thc/api"
import { ErrorBoundary, For, Show, Suspense } from "solid-js"

import type { TagListItem } from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { tw } from "~/utils"
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
import {
	ReleaseCard,
	ReleaseCardSkeleton,
} from "~/view/Homepage/component/ReleaseCard"
import { TagsCard, TagsCardSkeleton } from "~/view/Homepage/component/TagsCard"
import { RELEASES_LIMIT } from "~/view/Homepage/constants"

const RELEASES_GRID_CLASS = tw(`
	grid grid-cols-[repeat(auto-fit,minmax(min(100%,max(8.75rem,25%)),1fr))] gap-0.5
`)

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
	tags: TagListItem[]
}

export function HomePage(props: HomePageProps) {
	const { t } = useLingui()
	return (
		<PageLayout style={{ "--page-width": "90rem" }}>
			<Suspense fallback={<HomeStats />}>
				<ErrorBoundary fallback={() => <HomeStats />}>
					<HomeStats metadata={props.metadata} />
				</ErrorBoundary>
			</Suspense>

			<section
				class="grid gap-x-8 gap-y-6 px-4 pt-4 pb-8
					sm:px-6
					lg:grid-cols-[1.35fr_0.65fr] lg:px-8"
			>
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

				<div class="grid min-w-0 content-start grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-8">
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

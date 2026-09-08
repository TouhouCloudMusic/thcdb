import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Event } from "@thc/api"
import { ErrorBoundary, For, Show, Suspense } from "solid-js"

import type {
	ArtistListItem,
	HomeStatistics,
	ReleaseListItem,
	TagListItem,
} from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { px } from "~/style/tokens.stylex"
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

const styles = stylex.create({
	releases: {
		display: "grid",
		gridTemplateColumns:
			"repeat(auto-fit,minmax(min(100%,max(8.75rem,25%)),1fr))",
		gap: px[2],
	},
	empty: { height: px[224] },
	content: {
		display: "grid",
		columnGap: px[32],
		rowGap: px[24],
		paddingInline: {
			default: px[16],
			"@media (min-width: 40rem)": px[24],
			"@media (min-width: 64rem)": px[32],
		},
		paddingTop: px[16],
		paddingBottom: px[32],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 64rem)": "1.35fr 0.65fr",
		},
	},
	side: {
		display: "grid",
		minWidth: 0,
		alignContent: "start",
		gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,16rem),1fr))",
		gap: px[32],
	},
})

function ReleasesGridSkeleton() {
	return (
		<div {...stylex.attrs(styles.releases)}>
			<For each={Array.from({ length: RELEASES_LIMIT })}>
				{() => <ReleaseCardSkeleton />}
			</For>
		</div>
	)
}

function ReleasesGrid(props: { releases: ReleaseListItem[] }) {
	return (
		<Show
			when={props.releases.length > 0}
			fallback={<HomeEmptySlot styles={styles.empty} />}
		>
			<div {...stylex.attrs(styles.releases)}>
				<For each={props.releases}>
					{(release) => <ReleaseCard release={release} />}
				</For>
			</div>
		</Show>
	)
}

type HomePageProps = {
	statistics?: HomeStatistics
	releases: ReleaseListItem[]
	artists: ArtistListItem[]
	events: Event[]
	tags: TagListItem[]
}

export function HomePage(props: HomePageProps) {
	const { t } = useLingui()
	return (
		<PageLayout style={{ "--page-width": "90rem" }}>
			<Suspense fallback={<HomeStats />}>
				<ErrorBoundary fallback={() => <HomeStats />}>
					<HomeStats statistics={props.statistics} />
				</ErrorBoundary>
			</Suspense>

			<section {...stylex.attrs(styles.content)}>
				<ExploreSection
					title={t`Popular Releases`}
					to="/release/explore"
				>
					<Suspense fallback={<ReleasesGridSkeleton />}>
						<ReleasesGrid releases={props.releases} />
					</Suspense>
					<Suspense fallback={<ArtistsCardSkeleton />}>
						<ArtistsCard artists={props.artists} />
					</Suspense>
				</ExploreSection>

				<div {...stylex.attrs(styles.side)}>
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

import { For } from "solid-js"

import { PageLayout } from "~/layout/PageLayout"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeHero } from "~/view/Homepage/component/HomeHero"
import { LatestArtistsCard } from "~/view/Homepage/component/LatestArtistsCard"
import { ReleaseCard } from "~/view/Homepage/component/ReleaseCard"
import { TrendingTagsCard } from "~/view/Homepage/component/TrendingTagsCard"
import { UpcomingEventsCard } from "~/view/Homepage/component/UpcomingEventsCard"
import {
	HOME_FEATURED_RELEASES,
	HOME_LATEST_ARTISTS,
	HOME_TRENDING_TAGS,
	HOME_UPCOMING_EVENTS,
} from "~/view/Homepage/mock"

const HomePage = () => (
	<PageLayout class="p-8">
		<div class="flex flex-col gap-10">
			<HomeHero />

			<section class="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
				<ExploreSection
					title="Latest Releases"
					to="/release/explore"
				>
					<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						<For each={HOME_FEATURED_RELEASES}>
							{(release) => <ReleaseCard release={release} />}
						</For>
					</div>

					<LatestArtistsCard artists={HOME_LATEST_ARTISTS} />
				</ExploreSection>

				<div class="flex flex-col gap-4">
					<div class="-mt-5">
						<TrendingTagsCard tags={HOME_TRENDING_TAGS} />
					</div>
					<UpcomingEventsCard events={HOME_UPCOMING_EVENTS} />
				</div>
			</section>
		</div>
	</PageLayout>
)

export { HomePage }

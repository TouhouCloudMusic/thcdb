import type { Tag } from "@thc/api"
import { For } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"

type TrendingTagsCardProps = {
	tags: Tag[]
}

const TrendingTagsCard = (props: TrendingTagsCardProps) => (
	<Card class="p-5 shadow-none">
		<ExploreSection
			title="Trending Tags"
			to="/tag/explore"
		>
			<div class="flex flex-wrap gap-2">
				<For each={props.tags.slice(0, 14)}>
					{(tag) => (
						<Link
							to="/tag/$id"
							params={{ id: tag.id.toString() }}
							class="rounded-full bg-slate-100 px-3 py-1 text-xs text-secondary no-underline ring-1 ring-slate-200 transition-colors duration-150 ring-inset hover:bg-slate-200 hover:no-underline motion-reduce:transition-none"
						>
							#{tag.name}
						</Link>
					)}
				</For>
			</div>
		</ExploreSection>
	</Card>
)

export { TrendingTagsCard }

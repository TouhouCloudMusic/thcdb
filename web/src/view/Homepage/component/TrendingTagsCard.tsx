import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { TagApi } from "@thc/api"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"

const MAX_VISIBLE_TAGS = 6
const TRENDING_TAGS_LIST_CLASS = "divide-y divide-slate-300"

function TagRowSkeleton() {
	return (
		<li class="py-3 first:pt-0 last:pb-0 animate-pulse motion-reduce:animate-none">
			<div class="h-4 w-1/3 rounded bg-slate-200"></div>
			<div class="mt-1.5 h-3.5 w-4/5 rounded bg-slate-100"></div>
		</li>
	)
}

function TrendingTagsEmpty() {
	return <HomeEmptySlot class="h-24" />
}

function TrendingTagsListSkeleton() {
	return (
		<ul class={TRENDING_TAGS_LIST_CLASS}>
			<For each={Array.from({ length: MAX_VISIBLE_TAGS })}>
				{() => <TagRowSkeleton />}
			</For>
		</ul>
	)
}

function TrendingTagsList() {
	const trendingTagsQuery = useQuery(() => ({
		queryKey: ["home::trending-tags", MAX_VISIBLE_TAGS],
		queryFn: async () => {
			const res = await TagApi.explore({
				query: {
					page: 1,
					limit: MAX_VISIBLE_TAGS,
					sort_field: "created_at",
					sort_direction: "desc",
				},
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})
			return paginated.items
		},
	}))

	const visibleTags = () =>
		(trendingTagsQuery.data ?? []).slice(0, MAX_VISIBLE_TAGS)

	return (
		<Show
			when={visibleTags().length > 0}
			fallback={<TrendingTagsEmpty />}
		>
			<ul class={TRENDING_TAGS_LIST_CLASS}>
				<For each={visibleTags()}>
					{(tag) => (
						<li class="py-3 first:pt-0 last:pb-0">
							<Link
								to="/tag/$id"
								params={{ id: tag.id.toString() }}
								class="block truncate text-base font-light tracking-normal text-primary"
							>
								{tag.name}
							</Link>
							<div class="mt-1 line-clamp-2 text-sm leading-snug font-light text-tertiary">
								{tag.short_description}
							</div>
						</li>
					)}
				</For>
			</ul>
		</Show>
	)
}

export function TrendingTagsCard() {
	const { t } = useLingui()
	return (
		<Card class="p-0 shadow-none">
			<ExploreSection
				title={t`Trending Tags`}
				to="/tag/explore"
			>
				<Suspense fallback={<TrendingTagsListSkeleton />}>
					<TrendingTagsList />
				</Suspense>
			</ExploreSection>
		</Card>
	)
}

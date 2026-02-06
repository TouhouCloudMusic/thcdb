import { useQuery } from "@tanstack/solid-query"
import { TagApi } from "@thc/api"
import { Either } from "effect"
import { For, Show, Suspense } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"

const MAX_VISIBLE_TAGS = 14

type TagChipSkeletonProps = {
	isLoading?: boolean
}

function TagChipSkeleton(props: TagChipSkeletonProps) {
	const pulse = () =>
		props.isLoading ? "animate-pulse motion-reduce:animate-none" : ""

	return (
		<div
			class={`rounded-full bg-slate-100 px-3 py-1 text-xs ring-1 ring-slate-200 ring-inset ${pulse()}`}
		>
			<div class="h-3 w-16 rounded bg-slate-200"></div>
		</div>
	)
}

function TrendingTagsEmpty() {
	return <HomeEmptySlot class="h-24" />
}

function TrendingTagsChipsSkeleton() {
	return (
		<div class="flex flex-wrap gap-2">
			<For each={Array.from({ length: MAX_VISIBLE_TAGS })}>
				{() => <TagChipSkeleton isLoading />}
			</For>
		</div>
	)
}

function TrendingTagsChips() {
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

	const tags = () => trendingTagsQuery.data ?? []
	const visibleTags = () => tags().slice(0, MAX_VISIBLE_TAGS)
	const hasTags = () => visibleTags().length > 0

	return (
		<Show
			when={hasTags()}
			fallback={<TrendingTagsEmpty />}
		>
			<div class="flex flex-wrap gap-2">
				<For each={visibleTags()}>
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
		</Show>
	)
}

export function TrendingTagsCard() {
	return (
		<Card class="p-5 shadow-none">
			<ExploreSection
				title="Trending Tags"
				to="/tag/explore"
			>
				<Suspense fallback={<TrendingTagsChipsSkeleton />}>
					<TrendingTagsChips />
				</Suspense>
			</ExploreSection>
		</Card>
	)
}

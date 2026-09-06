import { useLingui } from "@lingui/solid/macro"
import { For, Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import type { TagListItem } from "~/hey-api"
import { ExploreSection } from "~/view/Homepage/component/ExploreSection"
import { HomeEmptySlot } from "~/view/Homepage/component/HomeEmptySlot"
import { TAGS_LIMIT } from "~/view/Homepage/constants"

const TAGS_LIST_CLASS = "divide-y divide-slate-300"

function TagRowSkeleton() {
	return (
		<li class="py-3 first:pt-0 last:pb-0 animate-pulse motion-reduce:animate-none">
			<div class="h-4 w-1/3 rounded bg-slate-200"></div>
			<div class="mt-1.5 h-3.5 w-4/5 rounded bg-slate-100"></div>
		</li>
	)
}

function TagsListSkeleton() {
	return (
		<ul class={TAGS_LIST_CLASS}>
			<For each={Array.from({ length: TAGS_LIMIT })}>
				{() => <TagRowSkeleton />}
			</For>
		</ul>
	)
}

function TagsList(props: { tags: TagListItem[] }) {
	return (
		<Show
			when={props.tags.length > 0}
			fallback={<HomeEmptySlot class="h-24" />}
		>
			<ul class={TAGS_LIST_CLASS}>
				<For each={props.tags}>
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

export function TagsCardSkeleton() {
	const { t } = useLingui()
	return (
		<Card class="p-0 shadow-none">
			<ExploreSection
				title={t`Trending Tags`}
				to="/tag/explore"
			>
				<TagsListSkeleton />
			</ExploreSection>
		</Card>
	)
}

export function TagsCard(props: { tags: TagListItem[] }) {
	const { t } = useLingui()
	return (
		<Card class="p-0 shadow-none">
			<ExploreSection
				title={t`Trending Tags`}
				to="/tag/explore"
			>
				<TagsList tags={props.tags} />
			</ExploreSection>
		</Card>
	)
}

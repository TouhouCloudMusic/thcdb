import { t } from "@lingui/core/macro"
import { useQuery } from "@tanstack/solid-query"
import { TagApi } from "@thc/api"
import { Either } from "effect"
import { For, Show } from "solid-js"

import {
	EmptyExplorePlaceholder,
	ExplorePageLayout,
} from "~/component/feature/entity_explore"
import { TagTree } from "~/view/tag/TagTree"
import type { TagTreeNode } from "~/view/tag/TagTree"

const ROOT_COUNT = 6
const MAX_DEPTH = 4
const TREE_HEADING_ID = "tag-tree-title"

export function TagExplore() {
	const treeQuery = useQuery(() => ({
		queryKey: ["tag::tree", ROOT_COUNT, MAX_DEPTH],
		queryFn: async () => {
			const res = await TagApi.explore({
				query: { page: 1, limit: ROOT_COUNT },
			})
			const paginated = Either.getOrThrowWith(res, (error) => {
				throw error
			})

			return paginated.items.map(
				(tag): TagTreeNode => ({
					id: tag.id,
					name: tag.name,
					type: tag.type,
					short_description: tag.short_description,
					children: [],
				}),
			)
		},
	}))

	const nodes = () => treeQuery.data ?? []

	return (
		<ExplorePageLayout
			title={t`Tag Tree`}
			titleId={TREE_HEADING_ID}
			action={{ to: "/tag/new", label: t`Create tag` }}
		>
			<Show
				when={!treeQuery.isLoading}
				fallback={<TagTreeSkeleton />}
			>
				<Show
					when={nodes().length > 0}
					fallback={
						<EmptyExplorePlaceholder
							title={t`No tags found`}
							action={{ to: "/tag/new" }}
						/>
					}
				>
					<div class="p-3">
						<TagTree
							nodes={nodes()}
							headingId={TREE_HEADING_ID}
						/>
					</div>
				</Show>
			</Show>
		</ExplorePageLayout>
	)
}

type TagTreeSkeletonItemProps = {
	depth: number
	width: number
}

function TagTreeSkeletonItem(props: TagTreeSkeletonItemProps) {
	const indentStyle = () => ({ "padding-left": `${props.depth * 16}px` })
	const mainStyle = () => ({ width: `${props.width}px` })
	const subWidth = () => Math.max(80, props.width - 48)
	const subStyle = () => ({ width: `${subWidth()}px` })

	return (
		<div
			class="flex items-start gap-2"
			style={indentStyle()}
		>
			<div class="mt-1 h-4 w-4 rounded bg-slate-200"></div>
			<div class="flex flex-col gap-2">
				<div
					class="h-4 rounded bg-slate-200"
					style={mainStyle()}
				></div>
				<div
					class="h-3 rounded bg-slate-100"
					style={subStyle()}
				></div>
			</div>
		</div>
	)
}

function TagTreeSkeleton() {
	const skeletonItems = [
		{ id: 0, depth: 0, width: 180 },
		{ id: 1, depth: 1, width: 220 },
		{ id: 2, depth: 2, width: 200 },
		{ id: 3, depth: 1, width: 240 },
		{ id: 4, depth: 2, width: 190 },
		{ id: 5, depth: 0, width: 210 },
		{ id: 6, depth: 1, width: 170 },
		{ id: 7, depth: 2, width: 230 },
	]

	return (
		<div class="animate-pulse p-3">
			<div class="flex flex-col gap-3">
				<For each={skeletonItems}>
					{(item) => (
						<TagTreeSkeletonItem
							depth={item.depth}
							width={item.width}
						/>
					)}
				</For>
			</div>
		</div>
	)
}

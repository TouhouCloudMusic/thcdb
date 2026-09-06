import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Divider } from "~/component/atomic/Divider"
import { Select } from "~/component/atomic/form/select"
import { Intersperse } from "~/component/data/Intersperse"
import {
	EmptyExplorePlaceholder,
	ExplorePageLayout,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { TAG_TYPES } from "~/domain/tag/constants"
import type { TagListItem } from "~/hey-api"
import { exploreTagOptions } from "~/hey-api/@tanstack/solid-query.gen"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import { TagItem } from "~/view/tag/TagItem"

const route = getRouteApi("/tag/explore")

type TagExploreSearch = {
	tag_type?: TagListItem["type"][]
	order_by?: "asc" | "desc"
	limit: number
	page: number
}

type TagExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	tagTypeValue: "" | TagListItem["type"]
	orderBy: "asc" | "desc" | undefined
	onTagTypeChange: (value: "" | TagListItem["type"]) => void
	onOrderByChange: (value: "asc" | "desc") => void
}

function TagExploreFilterBar(props: TagExploreFilterBarProps) {
	const { t } = useLingui()
	const tagTypeLabel = (value: "" | TagListItem["type"]) =>
		value === "" ? t`All` : value

	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex flex-wrap items-center gap-4">
				<div class="flex items-center gap-2">
					<span class="text-sm text-slate-500">{t`Type`}</span>
					<Select.Root<"" | TagListItem["type"]>
						options={["", ...TAG_TYPES]}
						value={props.tagTypeValue}
						onChange={(value) => props.onTagTypeChange(value ?? "")}
						placeholder={t`All`}
						itemComponent={(optionProps) => (
							<Select.Item item={optionProps.item}>
								{tagTypeLabel(optionProps.item.rawValue)}
							</Select.Item>
						)}
					>
						<Select.Trigger>
							<Select.Value<"" | TagListItem["type"]>>
								{(state) => tagTypeLabel(state.selectedOption())}
							</Select.Value>
							<Select.Icon />
						</Select.Trigger>
						<Select.Portal>
							<Select.Content>
								<Select.Listbox />
							</Select.Content>
						</Select.Portal>
					</Select.Root>
				</div>

				<OrderBySelect
					value={props.orderBy}
					onChange={props.onOrderByChange}
				/>
			</div>
		</StickyFilterBar>
	)
}

export function TagExplore() {
	const { t } = useLingui()
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()
	const navigate = useNavigate({ from: "/tag/explore" })
	const tagsQuery = useQuery(() => {
		const snapshot = search()
		return exploreTagOptions({
			query: {
				page: snapshot.page,
				limit: snapshot.limit,
				tag_type: snapshot.tag_type,
				sort_direction: snapshot.order_by,
			},
		})
	})

	const tags = () => tagsQuery.data?.data.items ?? []
	const totalPages = () => tagsQuery.data?.data.total_pages ?? 0
	const tagTypeValue = () => search().tag_type?.[0] ?? ""

	const applyFilterPatch = (patch: Partial<TagExploreSearch>) => {
		void navigate({
			to: "/tag/explore",
			search: { ...search(), ...patch, page: 1 },
		})
	}

	const setPage = (page: number) => {
		void navigate({
			to: "/tag/explore",
			search: { ...search(), page },
		})
	}

	return (
		<ExplorePageLayout
			title={t`Explore Tags`}
			action={{ to: "/tag/new", label: t`Create tag` }}
		>
			<TagExploreFilterBar
				scrollDirection={scrollDirection}
				tagTypeValue={tagTypeValue()}
				orderBy={search().order_by}
				onTagTypeChange={(value) => {
					applyFilterPatch({
						tag_type: value === "" ? undefined : [value],
					})
				}}
				onOrderByChange={(value) => applyFilterPatch({ order_by: value })}
			/>

			<Show
				when={!tagsQuery.isLoading}
				fallback={<TagListSkeleton limit={search().limit} />}
			>
				<Show
					when={tags().length > 0}
					fallback={
						<EmptyExplorePlaceholder
							title={t`No tags found`}
							action={{ to: "/tag/new" }}
						/>
					}
				>
					<div class="flex flex-col gap-2 p-4">
						<Intersperse
							of={tags()}
							with={<Divider horizontal />}
						>
							{(tag) => <TagItem tag={tag} />}
						</Intersperse>
					</div>
				</Show>
			</Show>

			<Show when={totalPages() > 1}>
				<div class="flex justify-center py-6">
					<Pagination
						current={search().page}
						total={totalPages()}
						onPageChange={setPage}
					/>
				</div>
			</Show>
		</ExplorePageLayout>
	)
}

function TagItemSkeleton() {
	return (
		<div class="animate-pulse">
			<div class="mb-2 h-5 w-1/3 rounded bg-slate-200"></div>
			<div class="h-4 w-2/3 rounded bg-secondary"></div>
		</div>
	)
}

function TagListSkeleton(props: { limit: number }) {
	return (
		<div class="flex flex-col gap-2 p-4">
			<Intersperse
				of={Array.from({ length: props.limit })}
				with={<Divider horizontal />}
			>
				{() => <TagItemSkeleton />}
			</Intersperse>
		</div>
	)
}

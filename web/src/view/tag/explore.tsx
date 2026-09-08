import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
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
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"
import { TagItem } from "~/view/tag/TagItem"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	filters: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[16],
	},
	filter: { display: "flex", alignItems: "center", gap: px[8] },
	filterLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	pagination: {
		display: "flex",
		justifyContent: "center",
		paddingBlock: px[24],
	},
	skeletonTitle: {
		marginBottom: px[8],
		height: px[20],
		width: "calc(1/3 * 100%)",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonDescription: {
		height: px[16],
		width: "calc(2/3 * 100%)",
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
	},
})

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
			<div {...stylex.attrs(styles.filters)}>
				<div {...stylex.attrs(styles.filter)}>
					<span {...stylex.attrs(styles.filterLabel)}>{t`Type`}</span>
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
					<div {...stylex.attrs(styles.list)}>
						<Intersperse
							of={tags()}
							with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
						>
							{(tag) => <TagItem tag={tag} />}
						</Intersperse>
					</div>
				</Show>
			</Show>

			<Show when={totalPages() > 1}>
				<div {...stylex.attrs(styles.pagination)}>
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
		<div {...stylex.attrs(animationStyles.pulse)}>
			<div {...stylex.attrs(styles.skeletonTitle)}></div>
			<div {...stylex.attrs(styles.skeletonDescription)}></div>
		</div>
	)
}

function TagListSkeleton(props: { limit: number }) {
	return (
		<div {...stylex.attrs(styles.list)}>
			<Intersperse
				of={Array.from({ length: props.limit })}
				with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
			>
				{() => <TagItemSkeleton />}
			</Intersperse>
		</div>
	)
}

import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Intersperse } from "~/component/data/Intersperse"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import type { LabelListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import { radius, colors, px } from "~/style/tokens.stylex"

import { animationStyles } from "../../style/animations.stylex"
import { LabelItem } from "./LabelItem"

const styles = stylex.create({
	skeletonName: {
		marginBottom: px[8],
		height: px[20],
		width: "50%",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonDetails: {
		height: px[16],
		width: "66.66666666666666%",
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
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
})

export function LabelItemSkeleton() {
	return (
		<div {...stylex.attrs(animationStyles.pulse)}>
			<div {...stylex.attrs(styles.skeletonName)}></div>
			<div {...stylex.attrs(styles.skeletonDetails)}></div>
		</div>
	)
}

type LabelExploreFilterBarProps = {
	sortBy: "created_at" | "updated_at" | undefined
	onSortByChange: (value: "created_at" | "updated_at") => void
	orderBy: "asc" | "desc" | undefined
	onOrderByChange: (value: "asc" | "desc") => void
}

export function LabelExploreFilterBar(props: LabelExploreFilterBarProps) {
	return (
		<ExploreFilterBar>
			<CorrectionSortFieldSelect
				value={props.sortBy}
				onChange={props.onSortByChange}
			/>

			<OrderBySelect
				value={props.orderBy}
				onChange={props.onOrderByChange}
			/>
		</ExploreFilterBar>
	)
}

type LabelExploreListProps = {
	labels: LabelListItem[]
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

export function LabelExploreList(props: LabelExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.isLoading && props.labels.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No labels found`}
					action={{ to: "/label/new" }}
				/>
			</Show>

			<Show
				when={props.labels.length > 0 || props.isFetching || props.isLoading}
			>
				<div {...stylex.attrs(styles.list)}>
					<Intersperse
						of={props.labels}
						with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					>
						{(label) => <LabelItem label={label} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.labels.length > 0}>
							<span {...stylex.attrs(dividerStyles.horizontal)}></span>
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
						>
							{() => <LabelItemSkeleton />}
						</Intersperse>
					</Show>
				</div>
			</Show>

			<Show when={props.totalPages > 1}>
				<div {...stylex.attrs(styles.pagination)}>
					<Pagination
						current={props.page}
						total={props.totalPages}
						onPageChange={props.onPageChange}
					/>
				</div>
			</Show>
		</>
	)
}

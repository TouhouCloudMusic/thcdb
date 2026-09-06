import { useLingui } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import type { LabelListItem } from "~/hey-api"

import { LabelItem } from "./LabelItem"

export function LabelItemSkeleton() {
	return (
		<div class="animate-pulse">
			<div class="mb-2 h-5 w-1/2 rounded bg-slate-200"></div>
			<div class="h-4 w-2/3 rounded bg-secondary"></div>
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
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.labels}
						with={<Divider horizontal />}
					>
						{(label) => <LabelItem label={label} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.labels.length > 0}>
							<Divider horizontal />
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<Divider horizontal />}
						>
							{() => <LabelItemSkeleton />}
						</Intersperse>
					</Show>
				</div>
			</Show>

			<Show when={props.totalPages > 1}>
				<div class="flex justify-center py-6">
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

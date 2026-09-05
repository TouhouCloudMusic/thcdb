import { useLingui } from "@lingui/solid/macro"
import type { Label } from "@thc/api"
import type { Component } from "solid-js"
import { For, Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Link } from "~/component/atomic"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import { DateWithPrecision } from "~/domain/shared"

const getLabelAvatarText = (label: Label) => {
	const value = label.name.trim()
	if (!value) return "?"
	return value.slice(0, 1).toUpperCase()
}

const getLabelDateLine = (
	label: Label,
	fallback: { unknown: string; present: string },
) => {
	const founded =
		DateWithPrecision.display(label.founded_date) ?? fallback.unknown
	const dissolved =
		DateWithPrecision.display(label.dissolved_date) ?? fallback.present
	return `${founded} - ${dissolved}`
}

export const LabelItemSkeleton: Component = () => (
	<div class="animate-pulse border-b border-slate-200 py-4">
		<div class="flex gap-3">
			<div class="h-12 w-12 shrink-0 rounded-full bg-slate-200"></div>
			<div class="min-w-0 flex-1">
				<div class="mb-2 flex items-center gap-2">
					<div class="h-5 w-1/2 rounded bg-slate-200"></div>
					<div class="h-5 w-16 rounded bg-slate-100"></div>
				</div>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
					<div class="h-4 w-28 rounded bg-slate-100"></div>
					<div class="h-4 w-24 rounded bg-slate-100"></div>
					<div class="h-4 w-20 rounded bg-slate-100"></div>
				</div>
				<div class="mt-2 flex flex-wrap items-center gap-1">
					<div class="h-4 w-20 rounded bg-slate-100"></div>
					<div class="h-4 w-24 rounded bg-slate-100"></div>
				</div>
			</div>
		</div>
	</div>
)

type LabelItemProps = {
	label: Label
}

export const LabelItem: Component<LabelItemProps> = (props) => {
	const { t } = useLingui()
	const dateLine = () =>
		getLabelDateLine(props.label, {
			unknown: t`Unknown`,
			present: t`Present`,
		})

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="flex items-center gap-3">
				<Link
					to="/label/$id"
					params={{ id: props.label.id.toString() }}
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-sm font-medium text-slate-700 no-underline hover:border-slate-300 hover:no-underline focus-visible:ring-2 focus-visible:ring-slate-200"
				>
					{getLabelAvatarText(props.label)}
				</Link>

				<div class="min-w-0 flex-1">
					<div class="flex items-center justify-between gap-3">
						<Link
							to="/label/$id"
							params={{ id: props.label.id.toString() }}
							class="truncate text-slate-900 no-underline decoration-slate-300 underline-offset-2 hover:underline"
						>
							{props.label.name}
						</Link>

						<div class="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600">
							<LabelStatusText label={props.label} />
						</div>
					</div>

					<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
						<span>{dateLine()}</span>
					</div>
				</div>
			</div>
		</div>
	)
}

function LabelStatusText(props: { label: Label }) {
	const { t } = useLingui()
	const label = () => (props.label.dissolved_date ? t`Dissolved` : t`Active`)

	return <>{label()}</>
}

type LabelExploreFilterBarProps = {
	sortBy: "created_at" | "updated_at" | undefined
	onSortByChange: (value: "created_at" | "updated_at") => void
	orderBy: "asc" | "desc" | undefined
	onOrderByChange: (value: "asc" | "desc") => void
}

export const LabelExploreFilterBar: Component<LabelExploreFilterBarProps> = (
	props,
) => {
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
	labels: Label[]
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

export const LabelExploreList: Component<LabelExploreListProps> = (props) => {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.isLoading && props.labels.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No labels found`}
					action={{ to: "/label/new" }}
				/>
			</Show>

			<div class="flex flex-col">
				<For each={props.labels}>{(label) => <LabelItem label={label} />}</For>
			</div>

			<Show when={props.isFetching || props.isLoading}>
				<div class="flex flex-col">
					<For each={Array.from({ length: props.limit })}>
						{() => <LabelItemSkeleton />}
					</For>
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

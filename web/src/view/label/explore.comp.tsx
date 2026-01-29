import type { Label } from "@thc/api"
import type { Component } from "solid-js"
import { For, Show } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { Link } from "~/component/atomic"
import {
	CorrectionSortFieldSelect,
	EmptyExplorePlaceholder,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { DateWithPrecision } from "~/domain/shared"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

const getLabelAvatarText = (label: Label) => {
	const value = label.name.trim()
	if (!value) return "?"
	return value.slice(0, 1).toUpperCase()
}

const getLabelStatusText = (label: Label) => {
	return label.dissolved_date ? "Dissolved" : "Active"
}

const getLabelDateLine = (label: Label) => {
	const founded = DateWithPrecision.display(label.founded_date) ?? "Unknown"
	const dissolved = DateWithPrecision.display(label.dissolved_date) ?? "Present"
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
	const localizedNames = () => props.label.localized_names ?? []
	const visibleLocalizedNames = () => localizedNames().slice(0, 2)
	const extraLocalizedCount = () => Math.max(0, localizedNames().length - 2)
	const dateLine = () => getLabelDateLine(props.label)
	const statusText = () => getLabelStatusText(props.label)

	return (
		<div class="border-b border-slate-200 py-4 last:border-b-0">
			<div class="flex gap-3">
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
							{statusText()}
						</div>
					</div>

					<div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
						<span>{dateLine()}</span>
						<span class="text-slate-300">·</span>
						<span>Founders {props.label.founders?.length ?? 0}</span>
					</div>

					<Show when={visibleLocalizedNames().length > 0}>
						<div class="mt-2 flex flex-wrap items-center gap-1">
							<For each={visibleLocalizedNames()}>
								{(item) => (
									<span class="bg-slate-50 max-w-full rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
										{item.language.name}: {item.name}
									</span>
								)}
							</For>
							<Show when={extraLocalizedCount() > 0}>
								<span class="bg-slate-50 rounded-md border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
									+{extraLocalizedCount()}
								</span>
							</Show>
						</div>
					</Show>
				</div>
			</div>
		</div>
	)
}

type LabelExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	sortBy: "created_at" | "handled_at" | undefined
	onSortByChange: (value: "created_at" | "handled_at") => void
	orderBy: "asc" | "desc" | undefined
	onOrderByChange: (value: "asc" | "desc") => void
}

export const LabelExploreFilterBar: Component<LabelExploreFilterBarProps> = (
	props,
) => {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex flex-wrap items-center gap-4">
				<CorrectionSortFieldSelect
					value={props.sortBy}
					onChange={props.onSortByChange}
				/>

				<OrderBySelect
					value={props.orderBy}
					onChange={props.onOrderByChange}
				/>
			</div>
		</StickyFilterBar>
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
	return (
		<>
			<Show when={!props.isLoading && props.labels.length === 0}>
				<EmptyExplorePlaceholder
					title="No labels found"
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

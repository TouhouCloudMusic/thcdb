import type { ReleaseType } from "@thc/api"

import {
	CorrectionSortFieldSelect,
	ExploreFilter,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { RELEASE_TYPES } from "~/domain/release/constants"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

export type DisplayType = "wall" | "list"

type ReleaseExploreViewPickerProps = {
	displayType: DisplayType
	onChange: (value: DisplayType) => void
}

function ReleaseExploreViewPicker(props: ReleaseExploreViewPickerProps) {
	const viewButtonClass = (value: DisplayType) => {
		const isSelected = () => props.displayType === value
		const selectedClass = isSelected()
			? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
			: "text-slate-500 hover:bg-white/60 hover:text-slate-700"

		return `rounded-sm px-2 py-1 text-xs font-medium transition-colors ${selectedClass}`
	}

	return (
		<div class="ml-auto flex items-center gap-2">
			<span class="text-sm text-slate-500">View</span>
			<div class="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-1">
				<button
					type="button"
					class={viewButtonClass("wall")}
					aria-pressed={props.displayType === "wall"}
					onClick={() => props.onChange("wall")}
				>
					Wall
				</button>
				<button
					type="button"
					class={viewButtonClass("list")}
					aria-pressed={props.displayType === "list"}
					onClick={() => props.onChange("list")}
				>
					List
				</button>
			</div>
		</div>
	)
}

export type ReleaseExploreFilterStore = {
	releaseType: ReleaseType | undefined
	sortBy: "created_at" | "handled_at" | undefined
	orderBy: "asc" | "desc" | undefined
	displayType: DisplayType
	setReleaseType: (value: ReleaseType | undefined) => void
	setSortBy: (value: "created_at" | "handled_at") => void
	setOrderBy: (value: "asc" | "desc") => void
	setDisplayType: (value: DisplayType) => void
}

export type ReleaseExploreFilterBarProps = {
	scrollDirection: () => ScrollDirection
	store: ReleaseExploreFilterStore
}

export function ReleaseExploreFilterBar(props: ReleaseExploreFilterBarProps) {
	return (
		<StickyFilterBar scrollDirection={props.scrollDirection}>
			<div class="flex flex-wrap items-center gap-4">
				<ReleaseTypeSelect store={props.store} />

				<CorrectionSortFieldSelect
					value={props.store.sortBy}
					onChange={props.store.setSortBy}
				/>

				<OrderBySelect
					value={props.store.orderBy}
					onChange={props.store.setOrderBy}
				/>

				<ReleaseExploreViewPicker
					displayType={props.store.displayType}
					onChange={props.store.setDisplayType}
				/>
			</div>
		</StickyFilterBar>
	)
}

const SELECT_OPTIONS: { value: ReleaseType | "All"; label: string }[] = [
	{ value: "All", label: "All" },
	...RELEASE_TYPES.map((value) => ({
		value,
		label: value,
	})),
]

function ReleaseTypeSelect(props: { store: ReleaseExploreFilterStore }) {
	return (
		<ExploreFilter
			label="Type"
			options={SELECT_OPTIONS}
			value={props.store.releaseType ?? "All"}
			defaultValue="All"
			triggerClass="w-32"
			onChange={(value) => {
				if (value === "All") {
					props.store.setReleaseType(undefined)
				} else {
					props.store.setReleaseType(value)
				}
			}}
		/>
	)
}

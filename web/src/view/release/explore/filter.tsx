import { useLingui } from "@lingui/solid/macro"
import type { ReleaseType } from "@thc/api"

import {
	ExploreFilter,
	OrderBySelect,
	StickyFilterBar,
} from "~/component/feature/entity_explore"
import { RELEASE_TYPES } from "~/domain/release/constants"
import type { ScrollDirection } from "~/utils/solid/useScrollDirection"

export type DisplayType = "wall" | "list"
export type ReleaseSortField = "release_date" | "created_at" | "updated_at"

type ReleaseExploreViewPickerProps = {
	displayType: DisplayType
	onChange: (value: DisplayType) => void
}

function ReleaseExploreViewPicker(props: ReleaseExploreViewPickerProps) {
	const { t } = useLingui()
	const viewButtonClass = (value: DisplayType) => {
		const isSelected = () => props.displayType === value
		const selectedClass = isSelected()
			? "bg-white text-slate-900 shadow-xs ring-1 ring-slate-200"
			: "text-slate-500 hover:bg-white/60 hover:text-slate-700"

		return `rounded-sm px-2 py-1 text-xs font-medium transition-colors ${selectedClass}`
	}

	return (
		<div class="ml-auto flex items-center gap-2">
			<span class="text-sm text-slate-500">{t`View`}</span>
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
	sortBy: ReleaseSortField
	orderBy: "asc" | "desc" | undefined
	displayType: DisplayType
	setReleaseType: (value: ReleaseType | undefined) => void
	setSortBy: (value: ReleaseSortField) => void
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

				<ReleaseSortFieldSelect
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

function ReleaseSortFieldSelect(props: {
	value: ReleaseSortField
	onChange: (value: ReleaseSortField) => void
}) {
	const { t } = useLingui()
	return (
		<ExploreFilter
			label={t`Sort by`}
			value={props.value}
			defaultValue="release_date"
			onChange={props.onChange}
			options={[
				{ value: "release_date", label: t`Release date` },
				{ value: "created_at", label: t`Created At` },
				{ value: "updated_at", label: t`Updated At` },
			]}
		/>
	)
}

function ReleaseTypeSelect(props: { store: ReleaseExploreFilterStore }) {
	const { t } = useLingui()
	const selectOptions: { value: ReleaseType | "All"; label: string }[] = [
		{ value: "All", label: t`All` },
		...RELEASE_TYPES.map((value) => ({
			value,
			label: value,
		})),
	]

	return (
		<ExploreFilter
			label={t`Type`}
			options={selectOptions}
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

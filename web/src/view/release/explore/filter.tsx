import { useLingui } from "@lingui/solid/macro"
import type { ReleaseType } from "@thc/api"

import {
	ExploreFilter,
	ExploreFilterBar,
	GridListViewPicker,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import type { ViewMode } from "~/component/feature/entity_explore"
import { RELEASE_TYPES } from "~/domain/release/constants"

export type ReleaseSortField = "release_date" | "created_at" | "updated_at"

export type ReleaseExploreFilterStore = {
	releaseType: ReleaseType | undefined
	sortBy: ReleaseSortField
	orderBy: "asc" | "desc" | undefined
	displayType: ViewMode
	setReleaseType: (value: ReleaseType | undefined) => void
	setSortBy: (value: ReleaseSortField) => void
	setOrderBy: (value: "asc" | "desc") => void
	setDisplayType: (value: ViewMode) => void
}

export type ReleaseExploreFilterBarProps = {
	store: ReleaseExploreFilterStore
}

export function ReleaseExploreFilterBar(props: ReleaseExploreFilterBarProps) {
	return (
		<ExploreFilterBar
			actions={
				<GridListViewPicker
					value={props.store.displayType}
					onChange={props.store.setDisplayType}
				/>
			}
		>
			<ReleaseTypeSelect store={props.store} />

			<ReleaseSortFieldSelect
				value={props.store.sortBy}
				onChange={props.store.setSortBy}
			/>

			<OrderBySelect
				value={props.store.orderBy}
				onChange={props.store.setOrderBy}
			/>
		</ExploreFilterBar>
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

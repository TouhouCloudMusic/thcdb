import { ExploreFilter } from "~/component/feature/entity_explore/ExploreFilter"

export type CorrectionSortField = "created_at" | "handled_at"

export function CorrectionSortFieldSelect(props: {
	value: CorrectionSortField | undefined
	onChange: (value: CorrectionSortField) => void
}) {
	return (
		<ExploreFilter
			label="Sort by"
			value={props.value}
			defaultValue="created_at"
			onChange={props.onChange}
			options={[
				{ value: "created_at", label: "Created At" },
				{ value: "handled_at", label: "Handled At" },
			]}
		/>
	)
}

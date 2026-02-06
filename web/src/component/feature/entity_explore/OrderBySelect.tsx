import { ExploreFilter } from "~/component/feature/entity_explore/ExploreFilter"

export type OrderBy = "asc" | "desc"

export function OrderBySelect(props: {
	value: OrderBy | undefined
	onChange: (value: OrderBy) => void
}) {
	return (
		<ExploreFilter
			label="Order"
			value={props.value}
			defaultValue="desc"
			onChange={props.onChange}
			options={[
				{ value: "desc", label: "Descending" },
				{ value: "asc", label: "Ascending" },
			]}
		/>
	)
}

import { useLingui } from "@lingui/solid/macro"

import { ExploreFilter } from "~/component/feature/entity_explore/ExploreFilter"

export type OrderBy = "asc" | "desc"

export function OrderBySelect(props: {
	value: OrderBy | undefined
	onChange: (value: OrderBy) => void
}) {
	const { t } = useLingui()
	return (
		<ExploreFilter
			label={t`Order`}
			value={props.value}
			defaultValue="desc"
			onChange={props.onChange}
			options={[
				{ value: "desc", label: t`Descending` },
				{ value: "asc", label: t`Ascending` },
			]}
		/>
	)
}

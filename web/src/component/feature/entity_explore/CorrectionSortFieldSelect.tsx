import { useLingui } from "@lingui/solid/macro"

import { ExploreFilter } from "~/component/feature/entity_explore/ExploreFilter"

export type CorrectionSortField = "created_at" | "updated_at"

export function CorrectionSortFieldSelect(props: {
	value: CorrectionSortField | undefined
	onChange: (value: CorrectionSortField) => void
}) {
	const { t } = useLingui()
	return (
		<ExploreFilter
			label={t`Sort by`}
			value={props.value}
			defaultValue="created_at"
			onChange={props.onChange}
			options={[
				{ value: "created_at", label: t`Created At` },
				{ value: "updated_at", label: t`Updated At` },
			]}
		/>
	)
}

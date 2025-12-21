import type { JSX } from "solid-js"

import { Select } from "~/component/atomic/form/select"

export type CorrectionSortField = "created_at" | "handled_at"

export function CorrectionSortFieldSelect(props: {
	value: CorrectionSortField | undefined
	onChange: (value: CorrectionSortField) => void
}) {
	const handleChange: JSX.EventHandlerUnion<HTMLSelectElement, Event> = (e) => {
		props.onChange(
			e.currentTarget.value === "handled_at" ? "handled_at" : "created_at",
		)
	}

	return (
		<div class="flex items-center gap-2">
			<span class="text-sm text-slate-500">Sort by</span>
			<Select
				value={props.value ?? "created_at"}
				onChange={handleChange}
			>
				<Select.Option value="created_at">Created At</Select.Option>
				<Select.Option value="handled_at">Handled At</Select.Option>
			</Select>
		</div>
	)
}

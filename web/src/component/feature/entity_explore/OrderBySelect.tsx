import type { JSX } from "solid-js"

import { Select } from "~/component/atomic/form/select"

export type OrderBy = "asc" | "desc"

export function OrderBySelect(props: {
	value: OrderBy | undefined
	onChange: (value: OrderBy) => void
}) {
	const handleChange: JSX.EventHandlerUnion<HTMLSelectElement, Event> = (e) => {
		props.onChange(e.currentTarget.value === "asc" ? "asc" : "desc")
	}

	return (
		<div class="flex items-center gap-2">
			<span class="text-sm text-slate-500">Order</span>
			<Select
				value={props.value ?? "desc"}
				onChange={handleChange}
			>
				<Select.Option value="desc">Descending</Select.Option>
				<Select.Option value="asc">Ascending</Select.Option>
			</Select>
		</div>
	)
}

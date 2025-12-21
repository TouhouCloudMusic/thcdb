import { type Table as TableType } from "@tanstack/solid-table"
import { JSX } from "solid-js"

import { TableBody } from "./TableBody"
import { TableHeader } from "./TableHeader"

export const Table = <T extends unknown>(props: {
	table: TableType<T>
}): JSX.Element => {
	const table = () => props.table

	return (
		<table class="w-full">
			<TableHeader headerGroup={table().getHeaderGroups()} />
			<TableBody rowModel={table().getRowModel()} />
		</table>
	)
}

import * as stylex from "@stylexjs/stylex"
import type { Table as TableType } from "@tanstack/solid-table"
import type { JSX } from "solid-js"

import { TableBody } from "./TableBody"
import { TableHeader } from "./TableHeader"

const styles = stylex.create({
	table: { width: "100%" },
})

export const Table = <T,>(props: { table: TableType<T> }): JSX.Element => {
	const table = () => props.table

	return (
		<table {...stylex.attrs(styles.table)}>
			<TableHeader headerGroup={table().getHeaderGroups()} />
			<TableBody rowModel={table().getRowModel()} />
		</table>
	)
}

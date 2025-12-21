import { flexRender, type RowModel } from "@tanstack/solid-table"
import { For } from "solid-js"

export const TableBody = <T extends unknown>(props: {
	rowModel: RowModel<T>
}) => {
	return (
		<tbody>
			<For each={props.rowModel.rows}>
				{(r) => (
					<tr class="hover:bg-slate-100">
						<For each={r.getVisibleCells()}>
							{(c) => (
								<td class="p-2 first:rounded-l-md last:rounded-r-md">
									{flexRender(c.column.columnDef.cell, c.getContext())}
								</td>
							)}
						</For>
					</tr>
				)}
			</For>
		</tbody>
	)
}

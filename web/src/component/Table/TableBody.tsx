import * as stylex from "@stylexjs/stylex"
import { flexRender } from "@tanstack/solid-table"
import type { RowModel } from "@tanstack/solid-table"
import { For } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	row: {
		backgroundColor: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": palette.slate[100] },
		},
	},
	cell: {
		padding: px[8],
		borderTopLeftRadius: { default: null, ":first-child": px[6] },
		borderBottomLeftRadius: { default: null, ":first-child": px[6] },
		borderTopRightRadius: { default: null, ":last-child": px[6] },
		borderBottomRightRadius: { default: null, ":last-child": px[6] },
	},
})

export const TableBody = <T,>(props: { rowModel: RowModel<T> }) => {
	return (
		<tbody>
			<For each={props.rowModel.rows}>
				{(r) => (
					<tr {...stylex.attrs(styles.row)}>
						<For each={r.getVisibleCells()}>
							{(c) => (
								<td {...stylex.attrs(styles.cell)}>
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

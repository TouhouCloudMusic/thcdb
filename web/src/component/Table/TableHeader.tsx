import { flexRender, type HeaderGroup } from "@tanstack/solid-table"
import { For, ParentComponent } from "solid-js"

const HeaderCell: ParentComponent = (props) => {
	return <th>{props.children}</th>
}

const HeaderRow: ParentComponent = (props) => {
	return <tr>{props.children}</tr>
}

export const TableHeader = <T extends unknown>(props: {
	headerGroup: HeaderGroup<T>[]
}) => {
	return (
		<thead>
			<For each={props.headerGroup}>
				{(hg) => (
					<HeaderRow>
						<For each={hg.headers}>
							{(h) => (
								<HeaderCell>
									{h.isPlaceholder
										? null
										: flexRender(h.column.columnDef.header, h.getContext())}
								</HeaderCell>
							)}
						</For>
					</HeaderRow>
				)}
			</For>
		</thead>
	)
}

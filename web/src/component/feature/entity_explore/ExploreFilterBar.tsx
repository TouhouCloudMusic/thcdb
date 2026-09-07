import * as stylex from "@stylexjs/stylex"
import type { JSX, ParentProps } from "solid-js"
import { children, Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		containerType: "inline-size",
		borderBlockWidth: 1,
		borderBlockStyle: "solid",
		borderColor: palette.slate[100],
		paddingBlock: px[16],
	},
	layout: {
		display: "grid",
		minWidth: 0,
		gridTemplateColumns: {
			default: "repeat(1,minmax(0,1fr))",
			"@container (min-width: 21rem)": "repeat(2,minmax(0,1fr))",
			"@container (min-width: 33rem)": "repeat(1,minmax(0,1fr))",
		},
		alignItems: { default: "end", "@container (min-width: 33rem)": "baseline" },
		gap: px[16],
	},
	filters: {
		display: { default: "contents", "@container (min-width: 33rem)": "flex" },
		minWidth: 0,
		flexWrap: "wrap",
		alignItems: "baseline",
		gap: px[16],
	},
	actions: {
		justifySelf: "end",
		contain: "layout",
		gridColumnStart: { default: null, "@container (min-width: 21rem)": "2" },
	},
})

type ExploreFilterBarProps = ParentProps<{
	actions?: JSX.Element
}>

export function ExploreFilterBar(props: ExploreFilterBarProps) {
	const actions = children(() => props.actions)

	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.layout)}>
				<div {...stylex.attrs(styles.filters)}>{props.children}</div>

				<Show when={actions()}>
					{(content) => (
						<div {...stylex.attrs(styles.actions)}>{content()}</div>
					)}
				</Show>
			</div>
		</div>
	)
}

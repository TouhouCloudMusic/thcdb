import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { ActivityLogIcon, DashboardIcon } from "@thc/icons/radix"

import { palette } from "~/style/color/palette.stylex"
import { radius, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		display: "inline-grid",
		height: px[40],
		gridTemplateColumns: "repeat(2,2.5rem)",
		alignItems: "center",
		overflow: "hidden",
		borderRadius: radius.sm,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[300],
	},
	button: {
		display: "grid",
		height: "100%",
		placeItems: "center",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	selected: {
		backgroundColor: palette.white,
		color: palette.slate[900],
		boxShadow: `0 0 0 1px ${palette.slate[200]}, 0 1px 2px 0 rgb(0 0 0 / 0.05)`,
	},
	unselected: {
		color: {
			default: palette.slate[500],
			":hover": { default: null, "@media (hover: hover)": palette.slate[700] },
		},
		backgroundColor: {
			default: null,
			":hover": {
				default: null,
				"@media (hover: hover)": "color-mix(in oklab, white 60%, transparent)",
			},
		},
	},
})
export type ViewMode = "grid" | "list"

type GridListViewPickerProps = {
	value: ViewMode
	onChange: (value: ViewMode) => void
}

export function GridListViewPicker(props: GridListViewPickerProps) {
	const { t } = useLingui()
	return (
		<fieldset
			{...stylex.attrs(styles.root)}
			aria-label={t`View`}
		>
			<button
				type="button"
				{...stylex.attrs(
					styles.button,
					props.value === "grid" ? styles.selected : styles.unselected,
				)}
				aria-label={t`Grid view`}
				aria-pressed={props.value === "grid"}
				title={t`Grid view`}
				onClick={() => props.onChange("grid")}
			>
				<DashboardIcon />
			</button>
			<button
				type="button"
				{...stylex.attrs(
					styles.button,
					props.value === "list" ? styles.selected : styles.unselected,
				)}
				aria-label={t`List view`}
				aria-pressed={props.value === "list"}
				title={t`List view`}
				onClick={() => props.onChange("list")}
			>
				<ActivityLogIcon />
			</button>
		</fieldset>
	)
}

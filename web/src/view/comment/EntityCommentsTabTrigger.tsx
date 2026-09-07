import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic/Tab"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	trigger: { display: "flex", alignItems: "center", gap: px[8] },
	label: {
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
		paddingLeft: px[8],
		paddingRight: px[8],
		paddingTop: px[2],
		paddingBottom: px[2],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: colors.textSecondary,
	},
})

export type EntityCommentsTabTriggerProps = {
	count?: number
	styles?: StyleXStyles
}

export function EntityCommentsTabTrigger(props: EntityCommentsTabTriggerProps) {
	const { t } = useLingui()

	return (
		<Tab.Trigger
			value="Comments"
			styles={[styles.trigger, props.styles]}
		>
			<span>{t`Comments`}</span>
			<Suspense>
				<Show when={props.count !== undefined}>
					<span {...stylex.attrs(styles.label)}>{props.count}</span>
				</Show>
			</Suspense>
		</Tab.Trigger>
	)
}

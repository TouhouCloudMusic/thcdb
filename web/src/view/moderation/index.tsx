import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { PageLayout } from "~/layout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { colors, fontSizes, lineHeights, px } from "~/style/tokens.stylex"
import { heading } from "~/style/typography"

const styles = stylex.create({
	page: {
		height: "auto",
		minHeight: "100%",
		paddingBlock: px[32],
		paddingInline: { default: px[32], "@media (max-width: 40rem)": px[16] },
	},
	entry: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		flexWrap: "wrap",
		gap: px[12],
		marginTop: px[24],
		borderBlockStyle: "solid",
		borderBlockWidth: "1px",
		borderBlockColor: palette.slate[300],
		paddingBlock: px[20],
	},
	pendingCount: {
		color: colors.textSecondary,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
})

export function ModerationQueueIndex(props: { pendingCount?: number }) {
	const { t } = useLingui()
	return (
		<PageLayout styles={styles.page}>
			<h1 {...stylex.attrs(heading.md)}>{t`Moderation`}</h1>
			<section {...stylex.attrs(styles.entry)}>
				<h2 {...stylex.attrs(heading.sm)}>
					<Link
						to="/image-queue"
						search={{ status: "pending" }}
						class={stylex.attrs(link.base, link.withUnderline).class}
					>
						{t`Image Queue`}
					</Link>
				</h2>
				<Show when={props.pendingCount !== undefined}>
					<span
						{...stylex.attrs(styles.pendingCount)}
					>{t`${props.pendingCount} pending`}</span>
				</Show>
			</section>
		</PageLayout>
	)
}

import * as stylex from "@stylexjs/stylex"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Link } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { Show } from "solid-js"

import { PageLayout } from "~/layout"
import { link } from "~/style/link"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"

const styles = stylex.create({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: px[24],
		padding: { default: px[16], "@media (min-width: 40rem)": px[32] },
	},
	header: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[16],
	},
	title: {
		overflowWrap: "anywhere",
	},
	action: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
	},
})

type ExplorePageAction = {
	to: LinkComponentProps["to"]
	label: string
}

type ExplorePageLayoutProps = ParentProps<{
	title: string
	action?: ExplorePageAction
	titleId?: string
}>

export function ExplorePageLayout(props: ExplorePageLayoutProps) {
	return (
		<PageLayout styles={styles.root}>
			<div {...stylex.attrs(styles.header)}>
				<h1
					id={props.titleId}
					{...stylex.attrs(typography.heading.md, styles.title)}
				>
					{props.title}
				</h1>

				<Show when={props.action}>
					{(action) => (
						<Link
							to={action().to}
							class={
								stylex.attrs(link.base, link.withUnderline, styles.action).class
							}
						>
							{action().label}
						</Link>
					)}
				</Show>
			</div>

			{props.children}
		</PageLayout>
	)
}

import { Trans } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: { paddingInline: px[16], paddingBlock: px[40] },
	content: {
		marginInline: "auto",
		display: "flex",
		maxWidth: px[448],
		flexDirection: "column",
		alignItems: "center",
		textAlign: "center",
	},
	title: {
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		color: palette.slate[900],
	},
	description: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	inlineAction: { textDecorationLine: "underline" },
	action: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		color: colors.textTertiary,
	},
})

type Action = {
	to: LinkComponentProps["to"]
	label?: string
}

type Props = {
	title: string
	description?: string
	action?: Action
}

export function EmptyExplorePlaceholder(props: Props) {
	return (
		<section {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.content)}>
				<h2 {...stylex.attrs(styles.title)}>{props.title}</h2>

				<Show
					when={props.description}
					fallback={
						<Show when={props.action}>
							{(action) => (
								<p {...stylex.attrs(styles.description)}>
									<Trans>
										Try adjusting the filters, or{" "}
										<Link
											to={action().to}
											class={
												stylex.attrs(link.base, link.text, styles.inlineAction)
													.class
											}
										>
											create
										</Link>{" "}
										the first one.
									</Trans>
								</p>
							)}
						</Show>
					}
				>
					{(text) => <p {...stylex.attrs(styles.description)}>{text()}</p>}
				</Show>

				<Show when={props.action}>
					{(action) => (
						<Show when={props.description && action().label}>
							<Link
								to={action().to}
								class={stylex.attrs(link.base, link.text, styles.action).class}
							>
								{action().label}
							</Link>
						</Show>
					)}
				</Show>
			</div>
		</section>
	)
}

import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Suspense } from "solid-js"

import { link } from "~/style/link"
import { infoStyles } from "~/style/primitives"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		display: "flex",
		columnGap: px[4],
		minHeight: px[32],
		alignItems: "baseline",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	heading: { whiteSpace: "pre" },
	contributors: {
		display: "flex",
		flex: "1 1 auto",
		flexWrap: "wrap",
		columnGap: px[4],
		minWidth: 0,
		color: colors.textPrimary,
	},
	contributor: { whiteSpace: "nowrap" },
})

export type Contributor = {
	id: number
	name: string
}

type EntityContributorsProps = {
	contributors: Contributor[]
	styles?: StyleXStyles
}

export function EntityContributors(props: EntityContributorsProps) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(props.styles ?? styles.root)}>
			<div {...stylex.attrs(styles.heading, infoStyles.label)}>
				{t`Contributors:`}
			</div>
			<p {...stylex.attrs(styles.contributors)}>
				<Suspense fallback={<>{t`Loading contributors...`}</>}>
					<For each={props.contributors}>
						{(contributor, index) => (
							<span {...stylex.attrs(styles.contributor)}>
								<Link
									class={stylex.attrs(link.base, link.withUnderline).class}
									to="/profile/$username"
									params={{ username: contributor.name }}
								>
									{contributor.name}
								</Link>
								{index() < props.contributors.length - 1 && ","}
							</span>
						)}
					</For>
				</Suspense>
			</p>
		</div>
	)
}

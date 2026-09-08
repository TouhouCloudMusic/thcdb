import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { Suspense } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		display: "flex",
		flexWrap: "wrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	heading: { fontWeight: 500, color: colors.textTertiary, whiteSpace: "pre" },
	contributors: { color: colors.textPrimary, overflowWrap: "break-word" },
	separator: { whiteSpace: "pre" },
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
			<div {...stylex.attrs(styles.heading)}>{t`Contributors:`} </div>
			<p {...stylex.attrs(styles.contributors)}>
				<Suspense fallback={<>{t`Loading contributors...`}</>}>
					<Intersperse
						of={props.contributors}
						with={<span {...stylex.attrs(styles.separator)}>, </span>}
					>
						{(contributor) => (
							<Link
								class={stylex.attrs(link.base, link.text).class}
								to="/profile/$username"
								params={{ username: contributor.name }}
							>
								{contributor.name}
							</Link>
						)}
					</Intersperse>
				</Suspense>
			</p>
		</div>
	)
}

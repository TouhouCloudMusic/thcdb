import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createMemo, Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { getPreferredLocalizedTitle } from "~/domain/localized_title"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

const styles = stylex.create({
	sectionSpacing: {
		marginBlockStart: 0,
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	title: {
		overflowWrap: "break-word",
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		color: colors.textPrimary,
	},
	subtitle: {
		overflowWrap: "break-word",
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		color: colors.textTertiary,
	},
	artists: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
	},
	artistPrefix: { marginRight: px[8], color: colors.textTertiary },
	separator: { whiteSpace: "pre" },
	artistLink: {
		color: colors.textPrimary,
		textUnderlineOffset: "4px",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

export function ReleaseInfoTitleAndArtist() {
	const { t } = useLingui()
	const ctx = assertContext(ReleaseInfoPageContext)

	const preferredLocalizedTitle = createMemo(() =>
		getPreferredLocalizedTitle(ctx.release.localized_titles),
	)

	return (
		<div>
			<div {...stylex.attrs(styles.sectionSpacing)}>
				<h1 {...stylex.attrs(styles.title)}>{ctx.release.title}</h1>

				<Show when={preferredLocalizedTitle()}>
					<p {...stylex.attrs(styles.subtitle)}>
						{preferredLocalizedTitle()!.title}
					</p>
				</Show>
			</div>
			<div {...stylex.attrs(styles.sectionSpacing, styles.artists)}>
				<span {...stylex.attrs(styles.artistPrefix)}>{t`by`}</span>
				<Intersperse
					of={ctx.release.artists}
					with={<span {...stylex.attrs(styles.separator)}>, </span>}
				>
					{(artist) => (
						<Link
							to="/artist/$id"
							params={{ id: artist.id.toString() }}
							{...stylex.attrs(styles.artistLink)}
						>
							{artist.name}
						</Link>
					)}
				</Intersperse>
			</div>
		</div>
	)
}

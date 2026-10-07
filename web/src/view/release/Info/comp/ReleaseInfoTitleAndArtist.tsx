import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createMemo, Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { getPreferredLocalizedTitle } from "~/domain/localized_title"
import { colors, lineHeights, fontSizes } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

const styles = stylex.create({
	title: {
		overflowWrap: "break-word",
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
	separator: { whiteSpace: "pre" },
	artistLink: {
		color: "inherit",
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
	const ctx = assertContext(ReleaseInfoPageContext)

	const preferredLocalizedTitle = createMemo(() =>
		getPreferredLocalizedTitle(ctx.release.localized_titles),
	)

	return (
		<div>
			<div>
				<h1 {...stylex.attrs(typography.heading.md, styles.title)}>
					{ctx.release.title}
				</h1>

				<Show when={preferredLocalizedTitle()}>
					<p {...stylex.attrs(styles.subtitle)}>
						{preferredLocalizedTitle()!.title}
					</p>
				</Show>
			</div>
			<div
				{...stylex.attrs(
					typography.heading.xs,
					typography.heading.subtle,
					styles.artists,
				)}
			>
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

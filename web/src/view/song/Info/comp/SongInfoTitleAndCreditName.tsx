import * as stylex from "@stylexjs/stylex"
/* @refresh skip */
import { Link } from "@tanstack/solid-router"
import { createMemo, For, Match, Show, Switch } from "solid-js"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

const styles = stylex.create({
	section: {
		marginBlockStart: 0,
		marginBlockEnd: { default: null, ":not(:last-child)": px[16] },
	},
	title: {
		fontSize: fontSizes["3xl"],
		lineHeight: 1.25,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	creditName: {
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		fontWeight: 300,
		letterSpacing: "0.025em",
		color: colors.textTertiary,
	},
	label: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.05em",
		color: colors.textTertiary,
	},
	values: {
		display: "flex",
		flexWrap: "wrap",
		columnGap: px[16],
		rowGap: px[4],
	},
	artist: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		color: colors.textSecondary,
		textUnderlineOffset: "4px",
		transitionProperty: "all",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "200ms",
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

export function SongInfoTitleAndCreditName() {
	const context = assertContext(SongInfoPageContext)
	const localizedTitle = createMemo(
		() =>
			["en", "ja"].map((code) =>
				context.song.localized_titles?.find(
					// TODO: user defined language
					(title) => title.language.code === code,
				),
			)[0],
	)
	return (
		<header>
			<div {...stylex.attrs(styles.section)}>
				<h1 {...stylex.attrs(styles.title)}>{context.song.title}</h1>
				<Show when={localizedTitle()}>
					<div {...stylex.attrs(styles.creditName)}>
						{localizedTitle()!.title}
					</div>
				</Show>
			</div>

			<Switch>
				{/* TODO: Credit name */}
				<Match when={context.song.artists?.length}>
					<div {...stylex.attrs(styles.section)}>
						{/* TODO: use Info.Label */}
						<div {...stylex.attrs(styles.label)}>Artist</div>
						<ul {...stylex.attrs(styles.values)}>
							<For each={context.song.artists}>
								{(artist) => (
									<li>
										<Link
											to="/artist/$id"
											params={{ id: artist.id.toString() }}
											{...stylex.attrs(styles.artist)}
										>
											{artist.name}
										</Link>
									</li>
								)}
							</For>
						</ul>
					</div>
				</Match>
			</Switch>
		</header>
	)
}

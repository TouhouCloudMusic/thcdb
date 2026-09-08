import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"

import type { GroupedSongCredit } from "~/domain/song"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	credit: {
		position: "relative",
		marginInline: px[8],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
		paddingInline: px[8],
		paddingBlock: px[24],
	},
	layout: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "baseline",
		gap: px[32],
	},
	artist: { textAlign: "left" },
	link: {
		display: "inline-block",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		letterSpacing: ".05em",
		color: colors.textPrimary,
		textUnderlineOffset: "4px",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	roles: {
		textAlign: "right",
		fontSize: fontSizes.sm,
		lineHeight: 1.625,
		letterSpacing: ".05em",
		color: colors.textTertiary,
		textUnderlineOffset: "4px",
	},
	role: {
		marginBlockEnd: { default: px[4], ":last-child": 0 },
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

export function CreditList(props: { credits: GroupedSongCredit[] }) {
	return (
		<For each={props.credits}>
			{(credit) => (
				<li {...stylex.attrs(styles.credit)}>
					<div {...stylex.attrs(styles.layout)}>
						<div {...stylex.attrs(styles.artist)}>
							<Link
								to={"/artist/$id"}
								params={{
									id: credit.artist.id.toString(),
								}}
								{...stylex.attrs(styles.link)}
							>
								{credit.artist.name}
							</Link>
						</div>

						<ul {...stylex.attrs(styles.roles)}>
							{/* TODO: Role link */}
							<For each={credit.roles}>
								{(role) => <li {...stylex.attrs(styles.role)}>{role.name}</li>}
							</For>
						</ul>
					</div>
				</li>
			)}
		</For>
	)
}

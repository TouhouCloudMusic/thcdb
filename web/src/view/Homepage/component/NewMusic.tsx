import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	header: {
		marginBottom: px[16],
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	title: {
		fontSize: fontSizes.xl,
		lineHeight: 1.4,
		fontWeight: 700,
		color: colors.textPrimary,
	},
	more: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
	content: {
		borderRadius: radius.lg,
		backgroundColor: palette.white,
		padding: px[16],
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(2,minmax(0,1fr))",
		gap: px[16],
	},
	track: {
		display: "flex",
		alignItems: "center",
		borderRadius: radius.md,
		padding: px[8],
		backgroundColor: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": palette.slate[100] },
		},
	},
	cover: {
		height: px[40],
		width: px[40],
		flexShrink: 0,
		overflow: "hidden",
		borderRadius: radius.sm,
	},
	image: { height: "100%", width: "100%", objectFit: "cover" },
	detail: { marginLeft: px[12], flex: "1", overflow: "hidden" },
	name: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	artist: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	play: { padding: px[8], color: colors.textTertiary },
	icon: { height: px[20], width: px[20] },
})

export function NewMusic() {
	const { t } = useLingui()
	return (
		<div>
			<div {...stylex.attrs(styles.header)}>
				<h2 {...stylex.attrs(styles.title)}>{t`最新音乐`}</h2>
				<button
					type="button"
					{...stylex.attrs(styles.more)}
				>
					{t`View more`}
				</button>
			</div>

			<div {...stylex.attrs(styles.content)}>
				<div {...stylex.attrs(styles.grid)}>
					<For each={Array.from({ length: 6 }).fill(0)}>
						{(_, i) => (
							<div {...stylex.attrs(styles.track)}>
								<div {...stylex.attrs(styles.cover)}>
									<img
										src={`https://placehold.co/100x100/red/white?text=${i() + 1}`}
										alt={t`cover art`}
										{...stylex.attrs(styles.image)}
									/>
								</div>
								<div {...stylex.attrs(styles.detail)}>
									<h4 {...stylex.attrs(styles.name)}>
										{t`Touhou Cloud DB track`} {i() + 1}
									</h4>
									<p {...stylex.attrs(styles.artist)}>{t`幻想乡音乐人`}</p>
								</div>
								<button
									{...stylex.attrs(styles.play)}
									aria-label={t`Play track`}
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										{...stylex.attrs(styles.icon)}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
										></path>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										></path>
									</svg>
								</button>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	)
}

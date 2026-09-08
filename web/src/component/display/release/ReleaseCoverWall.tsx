import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { Image } from "~/component/image"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

const styles = stylex.create({
	release: { display: "flex", flexDirection: "column", gap: px[8] },
	cover: { aspectRatio: "1 / 1", overflow: "hidden" },
	image: { height: "100%", width: "100%", objectFit: "cover" },
	fallback: {
		display: "flex",
		height: "100%",
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: palette.slate[200],
	},
	fallbackLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	title: { textAlign: "center" },
	titleText: {
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textPrimary,
		textUnderlineOffset: "4px",
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

export type ReleaseCoverWallProps = {
	releases: ReleaseCoverWallRelease[]
}

type ReleaseCoverWallRelease = {
	id: number
	title: string
	cover_art_url?: string | null | undefined
}

export function ReleaseCoverWall(props: ReleaseCoverWallProps) {
	const { t } = useLingui()
	return (
		<For each={props.releases}>
			{(release) => (
				<div {...stylex.attrs(styles.release)}>
					<div {...stylex.attrs(styles.cover)}>
						<Image.Root>
							<Image.Img
								src={imgUrl(release.cover_art_url)}
								alt={release.title}
								styles={styles.image}
							/>
							<Image.Fallback>
								{(state) =>
									state !== Image.State.Ok && (
										// TODO: Better fallback
										<div {...stylex.attrs(styles.fallback)}>
											<span {...stylex.attrs(styles.fallbackLabel)}>
												{t`No cover art`}
											</span>
										</div>
									)
								}
							</Image.Fallback>
						</Image.Root>
					</div>
					<div {...stylex.attrs(styles.title)}>
						{/* TODO: Release Link */}
						<p {...stylex.attrs(styles.titleText)}>{release.title}</p>
					</div>
				</div>
			)}
		</For>
	)
}

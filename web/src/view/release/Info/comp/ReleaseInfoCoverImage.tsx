import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"

import { Image } from "~/component/image"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

const styles = stylex.create({
	cover: {
		isolation: "isolate",
		aspectRatio: "1 / 1",
		width: "100%",
		overflow: "hidden",
		backgroundColor: colors.backgroundSecondary,
		maxWidth: { default: null, "@media (min-width: 40rem)": px[256] },
	},
	placeholder: {
		display: "flex",
		width: "100%",
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: palette.slate[100],
	},
	placeholderText: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	image: { width: "100%", height: "100%", objectFit: "cover" },
})

export function ReleaseInfoCoverImage() {
	const { t } = useLingui()
	const ctx = assertContext(ReleaseInfoPageContext)
	const coverUrl = () => imgUrl(ctx.release.cover_art_url)

	return (
		<Image.Root>
			<div {...stylex.attrs(styles.cover)}>
				<Image.Fallback>
					{(state) => (
						<div {...stylex.attrs(styles.placeholder)}>
							{state !== Image.State.Loading && (
								<span
									{...stylex.attrs(styles.placeholderText)}
								>{t`No cover art`}</span>
							)}
						</div>
					)}
				</Image.Fallback>
				<Image.Img
					src={coverUrl()}
					alt={ctx.release.title}
					styles={styles.image}
				/>
			</div>
		</Image.Root>
	)
}

import * as stylex from "@stylexjs/stylex"

/* @refresh skip */
import { Image } from "~/component/image"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

// TODO:
// - Image src
// - Better fallback
//
const styles = stylex.create({
	cover: {
		isolation: "isolate",
		aspectRatio: "1 / 1",
		width: "100%",
		overflow: "hidden",
		backgroundColor: palette.slate[100],
		maxWidth: {
			default: null,
			"@media (min-width: 40rem)": px[256],
		},
	},
	imagePlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: palette.slate[100],
	},
	image: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
})

export function SongInfoCoverImage() {
	const context = assertContext(SongInfoPageContext)
	const coverUrl = () => imgUrl(context.song.releases?.[0]?.cover_art_url)
	return (
		<Image.Root>
			<div {...stylex.attrs(styles.cover)}>
				<Image.Fallback>
					{(state) =>
						state != Image.State.Ok && (
							<div {...stylex.attrs(styles.imagePlaceholder)}></div>
						)
					}
				</Image.Fallback>
				<Image.Img
					src={coverUrl()}
					styles={[styles.image]}
				/>
			</div>
		</Image.Root>
	)
}

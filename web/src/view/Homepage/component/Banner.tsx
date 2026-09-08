import * as stylex from "@stylexjs/stylex"
import { createMemo, For } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: { marginBottom: px[32] },
	banner: {
		position: "relative",
		height: px[256],
		overflow: "hidden",
		borderRadius: radius.lg,
		boxShadow:
			"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
	},
	image: { height: "100%", width: "100%", objectFit: "cover" },
	caption: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		backgroundImage:
			"linear-gradient(to top in oklab, color-mix(in oklab, black 70%, transparent) 0%, transparent 100%)",
		padding: px[16],
	},
	title: {
		fontSize: fontSizes.xl,
		lineHeight: 1.4,
		fontWeight: 700,
		color: palette.white,
	},
	pagination: {
		position: "absolute",
		right: px[12],
		bottom: px[12],
		display: "flex",
		gap: px[8],
	},
	dot: {
		height: px[8],
		width: px[8],
		borderRadius: radius.full,
		backgroundColor: "color-mix(in oklab, white 50%, transparent)",
	},
	active: { backgroundColor: palette.white },
})

type Banner = { id: number; imageUrl: string; title: string }
type BannerProps = {
	banners: Banner[]
}

export function Banner(props: BannerProps) {
	// 选择当前显示的轮播图
	const currentBanner = createMemo(() => props.banners[0]!)

	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.banner)}>
				<img
					src={currentBanner().imageUrl}
					alt={currentBanner().title}
					{...stylex.attrs(styles.image)}
				/>
				<div {...stylex.attrs(styles.caption)}>
					<h2 {...stylex.attrs(styles.title)}>{currentBanner().title}</h2>
				</div>

				<div {...stylex.attrs(styles.pagination)}>
					<For each={props.banners}>
						{(banner, index) => (
							<div
								{...stylex.attrs(styles.dot, index() === 0 && styles.active)}
							></div>
						)}
					</For>
				</div>
			</div>
		</div>
	)
}

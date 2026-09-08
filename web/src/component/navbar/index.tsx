import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { createSignal, For } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px, radius } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		position: "sticky",
		top: 0,
		zIndex: 10,
		backgroundColor: palette.white,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)",
	},
	nav: {
		display: "flex",
		alignItems: "center",
		columnGap: px[24],
		overflowX: "auto",
		scrollbarWidth: "none",
		"::-webkit-scrollbar": { display: "none" },
		paddingInline: px[24],
	},
	marker: {
		position: "absolute",
		right: 0,
		bottom: 0,
		left: 0,
		height: px[2],
		borderRadius: radius.full,
	},
	item: {
		position: "relative",
		paddingBlock: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		whiteSpace: "nowrap",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
	},
	inactive: {
		color: {
			default: palette.slate[600],
			":hover": { default: null, "@media (hover: hover)": palette.slate[900] },
		},
	},
})

type NavItem = {
	id: string
	label: string
	active?: boolean
}

export function Navbar() {
	const { t } = useLingui()
	const [items, setItems] = createSignal<NavItem[]>([
		{ id: "recommend", label: t`推荐`, active: true },
		{ id: "playlist", label: t`歌单` },
		{ id: "rank", label: t`排行榜` },
		{ id: "artist", label: t`歌手` },
		{ id: "album", label: t`专辑` },
		{ id: "doujin", label: t`同人社团` },
		{ id: "video", label: t`视频` },
		{ id: "article", label: t`文章` },
		{ id: "event", label: t`活动` },
	])

	const setActive = (id: string) => {
		setItems((prev) =>
			prev.map((item) => ({
				...item,
				active: item.id === id,
			})),
		)
	}

	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.nav)}>
				<For each={items()}>
					{(item) => (
						<button
							{...stylex.attrs(styles.item, !item.active && styles.inactive)}
							onClick={() => setActive(item.id)}
						>
							{item.label}
							{item.active && <div {...stylex.attrs(styles.marker)}></div>}
						</button>
					)}
				</For>
			</div>
		</div>
	)
}

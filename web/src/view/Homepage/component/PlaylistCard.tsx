import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		overflow: "hidden",
		borderRadius: radius.lg,
		backgroundColor: palette.white,
		boxShadow: {
			default: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
			":hover": {
				default: null,
				"@media (hover: hover)":
					"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
			},
		},
		transitionProperty: "box-shadow",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	cover: { aspectRatio: "1", overflow: "hidden" },
	image: {
		height: "100%",
		width: "100%",
		objectFit: "cover",
		transitionProperty: "transform, translate, scale, rotate",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		scale: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "1.05" },
		},
	},
	content: { padding: px[12] },
	title: {
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	creator: {
		marginTop: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
})

type PlaylistCardProps = {
	playlist: {
		id: number
		title: string
		coverUrl: string
		creator: string
	}
}

export function PlaylistCard(props: PlaylistCardProps) {
	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.cover)}>
				<img
					src={props.playlist.coverUrl}
					alt={props.playlist.title}
					{...stylex.attrs(styles.image)}
				/>
			</div>
			<div {...stylex.attrs(styles.content)}>
				<h3 {...stylex.attrs(styles.title)}>{props.playlist.title}</h3>
				<p {...stylex.attrs(styles.creator)}>{props.playlist.creator}</p>
			</div>
		</div>
	)
}

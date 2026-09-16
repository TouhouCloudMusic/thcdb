import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Show, splitProps } from "solid-js"

import { colors } from "../style/tokens.stylex"

const styles = stylex.create({
	root: {
		position: "relative",
		aspectRatio: "1 / 1",
		overflow: "hidden",
		backgroundColor: colors.backgroundSecondary,
	},
	link: {
		color: colors.textPrimary,
		textDecorationLine: "none",
		boxShadow: {
			default: null,
			":focus-visible": "0 0 0 2px currentColor",
		},
	},
	image: {
		position: "absolute",
		inset: 0,
		width: "100%",
		height: "100%",
		objectFit: "cover",
	},
})

export function Thumbnail(
	props: Omit<LinkComponentProps, "children" | "class"> & {
		src: string | undefined
		"aria-label": string
		styles?: StyleXStyles
		imageStyles?: StyleXStyles
	},
) {
	const [local, linkProps] = splitProps(props, ["src", "styles", "imageStyles"])

	return (
		<Show
			when={local.src}
			fallback={<div {...stylex.attrs(styles.root, local.styles)}></div>}
		>
			{(src) => (
				<Link
					{...linkProps}
					{...stylex.attrs(styles.root, styles.link, local.styles)}
				>
					<img
						src={src()}
						alt=""
						{...stylex.attrs(styles.image, local.imageStyles)}
						loading="lazy"
					/>
				</Link>
			)}
		</Show>
	)
}

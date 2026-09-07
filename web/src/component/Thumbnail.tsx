import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Show, splitProps } from "solid-js"

import { colors } from "../style/tokens.stylex"

const styles = stylex.create({
	fallback: { backgroundColor: colors.backgroundSecondary },
	link: {
		backgroundColor: colors.backgroundSecondary,
		color: colors.textPrimary,
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
			fallback={<div {...stylex.attrs(styles.fallback, local.styles)}></div>}
		>
			{(src) => (
				<Link
					{...linkProps}
					{...stylex.attrs(styles.link, local.styles)}
				>
					<img
						src={src()}
						alt=""
						{...stylex.attrs(local.imageStyles)}
						loading="lazy"
					/>
				</Link>
			)}
		</Show>
	)
}

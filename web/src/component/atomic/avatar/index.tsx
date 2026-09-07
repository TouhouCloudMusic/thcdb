import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { JSX } from "solid-js"
import { createSignal, Match, splitProps, Suspense, Switch } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

import { animationStyles } from "../../../style/animations.stylex"

const styles = stylex.create({
	root: {
		width: px[32],
		height: px[32],
		overflow: "hidden",
		borderRadius: radius.full,
	},
	loading: {
		width: px[32],
		height: px[32],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
	},
	fallback: {
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.slate[100],
		color: palette.slate[700],
	},
	image: { width: "100%", height: "100%", objectFit: "cover" },
	text: {
		display: "flex",
		height: "100%",
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
	},
})

type AvatarUser = {
	name: string
	avatar_url?: string | null
}

function getAvatarText(user: AvatarUser | undefined) {
	const value = user?.name.trim() ?? ""
	if (value.length === 0) return "?"
	return value.slice(0, 1).toUpperCase()
}

export type Props = Omit<
	JSX.ImgHTMLAttributes<HTMLImageElement>,
	"src" | "onError" | "class"
> & {
	styles?: StyleXStyles
	fallbackStyles?: StyleXStyles
	user?: AvatarUser | undefined
}

export function Avatar(props: Props) {
	const [failedSrc, setFailedSrc] = createSignal<string | undefined>(undefined)
	const [loadedSrc, setLoadedSrc] = createSignal<string | undefined>(undefined)

	const [_, otherProps] = splitProps(props, [
		"styles",
		"fallbackStyles",
		"user",
	])

	const imageSrc = () => imgUrl(props.user?.avatar_url)
	const validSrc = () => {
		const src = imageSrc()
		if (!src) return
		if (failedSrc() === src) return
		return src
	}
	const avatarText = () => getAvatarText(props.user)

	return (
		<Suspense
			fallback={
				<div
					{...stylex.attrs(styles.loading, animationStyles.pulse, props.styles)}
				></div>
			}
		>
			<div
				{...stylex.attrs(
					styles.root,
					!validSrc() && styles.fallback,
					props.styles,
				)}
			>
				<Switch>
					<Match when={validSrc()}>
						{(src) => {
							const isPending = () => loadedSrc() !== src()
							const handleLoad = () => {
								setLoadedSrc(src())
							}
							const handleError = () => {
								setFailedSrc(src())
							}

							return (
								<img
									{...otherProps}
									src={src()}
									alt={
										props.alt
										?? props.user?.name
										// @wc-include
										?? "avatar"
									}
									onLoad={handleLoad}
									onError={handleError}
									{...stylex.attrs(
										styles.image,
										isPending() && animationStyles.pulse,
									)}
								/>
							)
						}}
					</Match>
					<Match when={!validSrc()}>
						<div {...stylex.attrs(styles.text, props.fallbackStyles)}>
							{avatarText()}
						</div>
					</Match>
				</Switch>
			</div>
		</Suspense>
	)
}

import { Dialog } from "@kobalte/core"
import type { PolymorphicProps } from "@kobalte/core"
import type {
	DialogCloseButtonProps,
	DialogContentProps,
	DialogDescriptionProps,
	DialogOverlayProps,
	DialogRootProps,
	DialogTitleProps,
	DialogTriggerRenderProps,
} from "@kobalte/core/dialog"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { splitProps } from "solid-js"

import { Button } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { colors, fontSizes, px } from "~/style/tokens.stylex"

import { animationNames } from "../../style/animations.stylex"

const styles = stylex.create({
	overlay: {
		position: "fixed",
		inset: 0,
		zIndex: 50,
		backgroundColor: `color-mix(in oklab, ${palette.slate[900]} 20%, transparent)`,
		opacity: { default: 0, ":is([data-expanded])": 1 },
		animationDuration: "200ms",
		animationTimingFunction: "ease",
		animationName: {
			default: animationNames.fadeOut,
			":is([data-expanded])": animationNames.fadeIn,
			":is([data-blur])": animationNames.blurOut,
			":is([data-blur][data-expanded])": animationNames.blurIn,
		},
		backdropFilter: {
			default: null,
			":is([data-blur])": "none",
			":is([data-blur][data-expanded])": "blur(2px)",
		},
	},
	content: {
		backgroundColor: colors.backgroundPrimary,
		position: "fixed",
		zIndex: 50,
		margin: "auto",
		left: "50%",
		top: "50%",
		translate: "-50% -50%",
		animationDuration: "200ms",
		animationTimingFunction: "ease",
		animationName: {
			default: animationNames.scaleFadeOut,
			":is([data-expanded])": animationNames.scaleFadeIn,
		},
	},
	title: { fontWeight: 500 },
	description: {
		marginTop: px[8],
		paddingRight: px[8],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		color: palette.slate[800],
	},
})

export type RootProps = DialogRootProps
export type TriggerRenderProps = DialogTriggerRenderProps

export function Root(props: RootProps) {
	return <Dialog.Root {...props} />
}

export const Trigger = Dialog.Trigger

export const Portal = Dialog.Portal

export type OverlayProps = PolymorphicProps<
	"div",
	DialogOverlayProps<"div">
> & { styles?: StyleXStyles; "data-blur"?: boolean | undefined }

export function Overlay(props: OverlayProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Dialog.Overlay
			{...others}
			{...stylex.attrs(styles.overlay, local.styles)}
		/>
	)
}

export type ContentProps = PolymorphicProps<
	"div",
	DialogContentProps<"div">
> & { styles?: StyleXStyles }

export function Content(props: ContentProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Dialog.Content
			{...others}
			{...stylex.attrs(styles.content, local.styles)}
		/>
	)
}

type CloseButtonProps = PolymorphicProps<
	typeof Button,
	DialogCloseButtonProps<typeof Button>
> & {
	styles?: StyleXStyles
}

export function CloseButton(props: CloseButtonProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Dialog.CloseButton
			{...others}
			as={Button}
			styles={local.styles}
		/>
	)
}

export function Title(
	props: PolymorphicProps<"h2", DialogTitleProps<"h2">> & {
		styles?: StyleXStyles
	},
) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Dialog.Title
			{...others}
			{...stylex.attrs(styles.title, local.styles)}
		/>
	)
}

export function Description(
	props: PolymorphicProps<"p", DialogDescriptionProps<"p">> & {
		styles?: StyleXStyles
	},
) {
	const [local, others] = splitProps(props, ["styles"])
	return (
		<Dialog.Description
			{...others}
			{...stylex.attrs(styles.description, local.styles)}
		/>
	)
}

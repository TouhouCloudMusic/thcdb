import type { PolymorphicProps } from "@kobalte/core"
import type {
	PopoverArrowProps,
	PopoverCloseButtonProps,
	PopoverContentProps,
	PopoverDescriptionProps,
	PopoverRootProps,
	PopoverTitleProps,
} from "@kobalte/core/popover"
import { Popover } from "@kobalte/core/popover"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { splitProps } from "solid-js"
import type { ValidComponent } from "solid-js"

import { Button } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	effects,
	lineHeights,
	fontSizes,
	size,
} from "~/style/tokens.stylex"

const scaleUp = stylex.keyframes({
	from: { transform: `scale(${effects.scaleUpStart})`, opacity: 0 },
	to: { transform: "scale(1)", opacity: 1 },
})
const scaleDown = stylex.keyframes({
	from: { transform: "scale(1)", opacity: 1 },
	to: { transform: `scale(${effects.scaleUpStart})`, opacity: 0 },
})

const styles = stylex.create({
	content: {
		position: "fixed",
		zIndex: 50,
		padding: size[16],
		backgroundColor: colors.backgroundPrimary,
		borderWidth: "1px",
		borderBottomWidth: "1.5px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1)",
		borderRadius: radius.sm,
		animationName: { default: scaleDown, ":is([data-expanded])": scaleUp },
		animationDuration: "200ms",
		animationTimingFunction: {
			default: "ease-in",
			":is([data-expanded])": "ease-out",
		},
		transformOrigin: "var(--kb-popper-content-transform-origin)",
	},
	title: { fontWeight: 500 },
	description: {
		marginBlock: size[8],
		paddingRight: size[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[800],
	},
})

export type RootProps = PopoverRootProps

export function Root(props: RootProps) {
	return <Popover {...props} />
}

export const Trigger = Popover.Trigger
export const Portal = Popover.Portal

export type ContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	PopoverContentProps<T>
> & { styles?: StyleXStyles }

export function Content<T extends ValidComponent = "div">(
	props: ContentProps<T>,
) {
	const [local, rest] = splitProps(props, ["styles"])
	return (
		<Popover.Content
			{...rest}
			{...stylex.attrs(styles.content, local.styles)}
		/>
	)
}

export function PortalContent<T extends ValidComponent = "div">(
	props: ContentProps<T>,
) {
	return (
		<Portal>
			<Content {...props} />
		</Portal>
	)
}

type CloseButtonProps = PolymorphicProps<
	typeof Button,
	PopoverCloseButtonProps<typeof Button>
> & {
	styles?: StyleXStyles
}

export function CloseButton(props: CloseButtonProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Popover.CloseButton
			{...others}
			as={Button}
			styles={local.styles}
		/>
	)
}

export function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, PopoverTitleProps<T>> & { styles?: StyleXStyles },
) {
	const [local, rest] = splitProps(props, ["styles"])
	return (
		<Popover.Title
			{...rest}
			{...stylex.attrs(styles.title, local.styles)}
		/>
	)
}

export function Arrow(props: PolymorphicProps<"div", PopoverArrowProps>) {
	return <Popover.Arrow {...props} />
}

export function Description<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, PopoverDescriptionProps<T>> & {
		styles?: StyleXStyles
	},
) {
	const [local, rest] = splitProps(props, ["styles"])
	return (
		<Popover.Description
			{...rest}
			{...stylex.attrs(styles.description, local.styles)}
		/>
	)
}

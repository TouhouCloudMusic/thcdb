import * as K_DropdownMenu from "@kobalte/core/dropdown-menu"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ComponentProps } from "solid-js"
import { splitProps } from "solid-js"

import { Button } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"

import { animationNames } from "../../../style/animations.stylex"

const styles = stylex.create({
	trigger: {
		width: px[32],
		height: px[32],
		padding: 0,
		boxShadow: "none",
		backgroundColor: {
			default: colors.backgroundPrimary,
			":hover": {
				default: null,
				"@media (hover: hover)": {
					default: palette.slate[200],
					[stylex.when.ancestor('[data-mode="dark"]')]:
						`color-mix(in oklab, ${palette.slate[100]} 90%, transparent)`,
				},
			},
			":active": {
				default: palette.slate[300],
				[stylex.when.ancestor('[data-mode="dark"]')]:
					`color-mix(in oklab, ${palette.slate[100]} 80%, transparent)`,
			},
			":disabled": palette.slate[400],
			":is([data-expanded])": palette.slate[200],
		},
	},
	content: {
		zIndex: 50,
		transformOrigin: "var(--kb-popper-content-transform-origin)",
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		padding: px[4],
		boxShadow:
			"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
		outlineStyle: "none",
		animationDuration: "200ms",
		animationTimingFunction: {
			default: "ease-in",
			":is([data-expanded])": "ease-out",
		},
		animationName: {
			default: animationNames.scaleDown,
			":is([data-expanded])": animationNames.scaleUp,
		},
	},
	item: {
		display: "flex",
		cursor: "default",
		alignItems: "center",
		borderRadius: radius.xs,
		paddingInline: px[8],
		paddingBlock: px[6],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		color: palette.slate[900],
		userSelect: "none",
		outlineStyle: "none",
		pointerEvents: { default: null, ":is([data-disabled])": "none" },
		opacity: { default: null, ":is([data-disabled])": 0.5 },
		backgroundColor: {
			default: null,
			":is([data-highlighted])": palette.slate[100],
		},
	},
	separator: {
		marginBlock: px[4],
		height: "1px",
		borderWidth: 0,
		backgroundColor: palette.slate[200],
	},
})

const Root = K_DropdownMenu.Root

type TriggerProps = ComponentProps<typeof K_DropdownMenu.Trigger> & {
	styles?: StyleXStyles
}
function Trigger(props: TriggerProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_DropdownMenu.Trigger
			{...others}
			as={Button}
			type={props.type ?? "button"}
			appearance="soft"
			tone="gray"
			size="sm"
			styles={[styles.trigger, local.styles]}
		/>
	)
}

const Icon = K_DropdownMenu.Icon
const Portal = K_DropdownMenu.Portal

type ContentProps = ComponentProps<typeof K_DropdownMenu.Content> & {
	styles?: StyleXStyles
}
function Content(props: ContentProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_DropdownMenu.Content
			{...others}
			{...stylex.attrs(styles.content, local.styles)}
		/>
	)
}

type ItemProps = ComponentProps<typeof K_DropdownMenu.Item> & {
	styles?: StyleXStyles
}
function Item(props: ItemProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_DropdownMenu.Item
			{...others}
			{...stylex.attrs(styles.item, local.styles)}
		/>
	)
}

type SeparatorProps = ComponentProps<typeof K_DropdownMenu.Separator> & {
	styles?: StyleXStyles
}
function Separator(props: SeparatorProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_DropdownMenu.Separator
			{...others}
			{...stylex.attrs(styles.separator, local.styles)}
		/>
	)
}

export const DropdownMenu = /*#__PURE__*/ Object.assign(Root, {
	Root,
	Trigger,
	Icon,
	Portal,
	Content,
	Item,
	Separator,
})

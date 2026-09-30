import * as K_Select from "@kobalte/core/select"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { CaretSortIcon } from "@thc/icons/radix"
import type { ComponentProps, JSX } from "solid-js"
import { mergeProps, splitProps } from "solid-js"

import { textStyles } from "~/style"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	fontSizes,
	lineHeights,
	px,
} from "~/style/tokens.stylex"

import { inputStyles } from "../../Input"

export const underlineSelectStyles = stylex.create({
	trigger: {
		height: "auto",
		minHeight: px[32],
		backgroundColor: {
			default: colors.backgroundPrimary,
			":disabled": palette.slate[100],
		},
		borderWidth: 0,
		borderBottomWidth: "1px",
		borderRadius: 0,
		borderColor: {
			default: palette.slate[400],
			':is([aria-invalid="true"])': palette.reimu[600],
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):hover)": palette.reimu[500],
			},
			":focus-visible": palette.reimu[600],
			":is([data-expanded])": palette.reimu[600],
		},
		paddingBlock: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 400,
		color: { default: colors.textSecondary, ":disabled": palette.slate[400] },
		transitionProperty: "border-color, color",
	},
	content: {
		minWidth: px[160],
		borderRadius: radius.xs,
		borderColor: palette.slate[200],
		boxShadow: "none",
		backgroundColor: colors.backgroundPrimary,
	},
	listbox: {
		outlineStyle: "none",
	},
	item: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		alignItems: "center",
		borderRadius: 0,
		minHeight: px[32],
		paddingInline: px[12],
		paddingBlock: px[4],
		fontWeight: 400,
		color: {
			default: colors.textSecondary,
			":is([data-selected])": colors.textPrimary,
		},
		backgroundColor: {
			default: "transparent",
			":is([data-highlighted])": palette.slate[100],
		},
		opacity: { default: null, ":is([data-disabled])": 0.5 },
	},
})

const selectStyles = stylex.create({
	trigger: {
		display: "grid",
		gridTemplateColumns: `minmax(0, 1fr) ${px[32]}`,
		alignItems: "center",
		height: px[32],
		textAlign: "left",
		fontWeight: 300,
	},

	value: {
		paddingInlineStart: px[8],
	},

	icon: {
		display: "grid",
		placeItems: "center",
	},
	caret: { width: px[16], height: px[16], color: colors.textSecondary },

	content: {
		zIndex: 50,
		maxHeight: px[256],
		borderRadius: radius.sm,
		display: "flex",
		flexDirection: "column",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	},

	listbox: {
		minHeight: 0,
		overflowY: "auto",
		padding: px[4],
	},

	item: {
		cursor: "default",
		borderRadius: radius.xs,
		paddingInline: px[8],
		paddingBlock: px[6],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[900],
		userSelect: "none",
		backgroundColor: {
			default: null,
			":is([data-highlighted])": palette.slate[100],
		},
		outlineStyle: { default: null, ":is([data-highlighted])": "none" },
	},
})

function Root<Option, OptGroup = never>(
	props: ComponentProps<typeof K_Select.Root<Option, OptGroup, "div">> & {
		styles?: StyleXStyles
	},
) {
	const [local, others] = splitProps(props, ["styles"])
	return (
		<K_Select.Root<Option, OptGroup>
			{...others}
			{...stylex.attrs(local.styles)}
		/>
	)
}

type TriggerProps = ComponentProps<typeof K_Select.Trigger> & {
	styles?: StyleXStyles
}
function Trigger(props: TriggerProps) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_Select.Trigger
			{...others}
			{...stylex.attrs(inputStyles.like, selectStyles.trigger, local.styles)}
		/>
	)
}

type ValueProps<Option> = ComponentProps<typeof K_Select.Value<Option>> & {
	styles?: StyleXStyles
}
function Value<Option>(props: ValueProps<Option>) {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_Select.Value
			{...others}
			{...stylex.attrs(textStyles.ellipsis, selectStyles.value, local.styles)}
		/>
	)
}

type IconProps = ComponentProps<typeof K_Select.Icon> & {
	styles?: StyleXStyles
}
function Icon(props: IconProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])
	return (
		<K_Select.Icon
			{...others}
			{...stylex.attrs(selectStyles.icon, local.styles)}
		>
			<CaretSortIcon {...stylex.attrs(selectStyles.caret)} />
		</K_Select.Icon>
	)
}

type PortalProps = ComponentProps<typeof K_Select.Portal>
function Portal(props: PortalProps): JSX.Element {
	return <K_Select.Portal {...props} />
}

type ContentProps = ComponentProps<typeof K_Select.Content> & {
	styles?: StyleXStyles
}
function Content(props: ContentProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])
	const finalProps = mergeProps(others, { sameWidth: true })

	return (
		<K_Select.Content
			{...finalProps}
			{...stylex.attrs(selectStyles.content, local.styles)}
		/>
	)
}

type ListboxProps = ComponentProps<typeof K_Select.Listbox> & {
	styles?: StyleXStyles
}
function Listbox(props: ListboxProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_Select.Listbox
			{...others}
			{...stylex.attrs(selectStyles.listbox, local.styles)}
		/>
	)
}

type ItemProps = ComponentProps<typeof K_Select.Item> & {
	styles?: StyleXStyles
}
function Item(props: ItemProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<K_Select.Item
			{...others}
			{...stylex.attrs(selectStyles.item, local.styles)}
		/>
	)
}

export const Select = /*#__PURE__*/ Object.assign(Root, {
	Root,
	Trigger,
	Value,
	Icon,
	Portal,
	Content,
	Listbox,
	Item,
	HiddenSelect: K_Select.HiddenSelect,
})

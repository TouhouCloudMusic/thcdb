import * as K_Select from "@kobalte/core/select"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { CaretSortIcon } from "@thc/icons/radix"
import type { ComponentProps, JSX } from "solid-js"
import { mergeProps, splitProps } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"

import { inputStyles } from "../../Input"

const styles = stylex.create({
	trigger: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
		gap: px[8],
		paddingInline: px[8],
		textAlign: "left",
		fontWeight: 300,
	},
	value: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
	caret: { width: px[16], height: px[16], color: colors.textSecondary },
	content: {
		zIndex: 50,
		maxHeight: px[256],
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	},
	listbox: { padding: px[4] },
	item: {
		cursor: "default",
		borderRadius: radius.xs,
		paddingInline: px[8],
		paddingBlock: px[6],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
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
			{...stylex.attrs(
				inputStyles.like,
				inputStyles.input,
				styles.trigger,
				local.styles,
			)}
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
			{...stylex.attrs(styles.value, local.styles)}
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
			{...stylex.attrs(local.styles)}
		>
			<CaretSortIcon {...stylex.attrs(styles.caret)} />
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
			{...stylex.attrs(styles.content, local.styles)}
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
			{...stylex.attrs(styles.listbox, local.styles)}
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
			{...stylex.attrs(styles.item, local.styles)}
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

import { Combobox } from "@kobalte/core"
import type { ComboboxContentProps } from "@kobalte/core/combobox"
import type { PolymorphicProps } from "@kobalte/core/polymorphic"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { CaretSortIcon } from "@thc/icons/radix"
import {
	createSignal,
	mergeProps,
	createEffect,
	onCleanup,
	splitProps,
} from "solid-js"
import type { ComponentProps, JSX, ValidComponent } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"

import {
	ComboboxScrollContext,
	createComboboxScrollContext,
	useComboboxScroll,
} from "./scroll"

const styles = stylex.create({
	control: {
		display: "grid",
		gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
		position: "relative",
		isolation: "isolate",
	},
	inputBase: {
		color: { default: palette.slate[900], ":focus": colors.textPrimary },
		backgroundColor: {
			default: colors.backgroundPrimary,
			":disabled": palette.slate[100],
		},
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: {
			default: palette.slate[300],
			':is([aria-invalid="true"])': palette.reimu[600],
		},
		borderRadius: radius.sm,
		outlineWidth: "1.5px",
		outlineStyle: "solid",
		outlineOffset: "-1px",
		outlineColor: {
			default: "transparent",
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):hover)": palette.reimu[500],
			},
			":focus": palette.reimu[600],
		},
		transitionProperty: "all",
		transitionDuration: "100ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	input: { paddingInline: px[8], height: px[32] },
	multiContainer: { minHeight: "fit-content", height: px[32] },
	multiInput: { outlineStyle: { default: null, ":focus": "none" } },
	trigger: {
		position: "absolute",
		zIndex: 10,
		right: 0,
		height: "100%",
		marginInline: px[8],
	},
	caret: { width: px[20], height: px[20], color: colors.textSecondary },
	description: {
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		color: palette.slate[600],
		marginTop: px[4],
	},
	error: {
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		color: palette.reimu[600],
		marginTop: px[4],
	},
	content: {
		backgroundColor: palette.white,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		borderRadius: radius.sm,
		boxShadow:
			"0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
		maxHeight: px[256],
		overflow: "auto",
	},
	arrow: { fill: palette.white, stroke: palette.slate[300] },
	listbox: { outlineStyle: "none" },
	item: {
		display: "flex",
		placeContent: "space-between",
		alignItems: "baseline",
		padding: px[8],
		borderLeftWidth: "2px",
		borderStyle: "solid",
		borderColor: {
			default: "transparent",
			":hover": { default: null, "@media (hover: hover)": palette.reimu[600] },
			":is([data-highlighted])": palette.reimu[600],
		},
		backgroundColor: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": palette.slate[100] },
			":is([data-highlighted])": palette.slate[100],
		},
		transitionProperty: "all",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	itemLabel: { color: palette.slate[900] },
})

function ComboboxScrollProvider(props: { children: JSX.Element }) {
	const contextValue = createComboboxScrollContext()
	return (
		<ComboboxScrollContext.Provider value={contextValue}>
			{props.children}
		</ComboboxScrollContext.Provider>
	)
}

export function Root<Opt, OptGroup>(
	props: ComponentProps<typeof Combobox.Root<Opt, OptGroup, "div">> & {
		styles?: StyleXStyles
	},
): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])
	return (
		<ComboboxScrollProvider>
			<Combobox.Root
				{...others}
				{...stylex.attrs(local.styles)}
			/>
		</ComboboxScrollProvider>
	)
}

// Label Component

export type LabelProps = ComponentProps<typeof Combobox.Label> & {
	styles?: StyleXStyles
}

export function Label(props: LabelProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Label
			{...others}
			{...stylex.attrs(local.styles)}
		/>
	)
}

// Control Component

export type ControlProps = ComponentProps<typeof Combobox.Control<"div">> & {
	styles?: StyleXStyles
}

export function Control(props: ControlProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Control
			{...others}
			{...stylex.attrs(styles.control, local.styles)}
		/>
	)
}

// TODO: Replace it with common input

export type InputProps<T extends ValidComponent = "input"> = ComponentProps<
	typeof Combobox.Input<T>
> & { styles?: StyleXStyles }

export function Input(props: InputProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Input
			{...others}
			{...stylex.attrs(styles.inputBase, styles.input, local.styles)}
		/>
	)
}

export function MultiInputContainer(
	props: ComponentProps<"ul"> & { styles?: StyleXStyles },
): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<ul
			{...others}
			{...stylex.attrs(styles.inputBase, styles.multiContainer, local.styles)}
		></ul>
	)
}

export function MultiInput(props: InputProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Input
			{...others}
			{...stylex.attrs(styles.multiInput, local.styles)}
		/>
	)
}

export const HiddenSelect = Combobox.HiddenSelect

// Trigger Component

export type TriggerProps = ComponentProps<typeof Combobox.Trigger> & {
	styles?: StyleXStyles
}

export function Trigger(props: TriggerProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Trigger
			{...others}
			{...stylex.attrs(styles.trigger, local.styles)}
		/>
	)
}

// Icon Component

export type IconProps = ComponentProps<typeof Combobox.Icon> & {
	styles?: StyleXStyles
}

export function Icon(props: IconProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Icon
			{...others}
			{...stylex.attrs(local.styles)}
		>
			<CaretSortIcon {...stylex.attrs(styles.caret)} />
		</Combobox.Icon>
	)
}

// Description Component

export type DescriptionProps = ComponentProps<typeof Combobox.Description> & {
	styles?: StyleXStyles
}

export function Description(props: DescriptionProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Description
			{...others}
			{...stylex.attrs(styles.description, local.styles)}
		/>
	)
}

// ErrorMessage Component

export type ErrorMessageProps = ComponentProps<typeof Combobox.ErrorMessage> & {
	styles?: StyleXStyles
}

export function ErrorMessage(props: ErrorMessageProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.ErrorMessage
			{...others}
			{...stylex.attrs(styles.error, local.styles)}
		/>
	)
}

// Portal Component

export type PortalProps = ComponentProps<typeof Combobox.Portal>

export function Portal(props: PortalProps): JSX.Element {
	return <Combobox.Portal {...props} />
}

// Content Component

export type ContentProps = PolymorphicProps<
	"div",
	ComboboxContentProps<"div">
> & { styles?: StyleXStyles }

export function Content(props: ContentProps): JSX.Element {
	const scrollContext = useComboboxScroll()

	const [local, others] = splitProps(props, ["styles"])
	const finalProps = mergeProps(others, {
		ref(el: HTMLDivElement) {
			scrollContext.setScrollContainer(el)
			if (typeof props.ref === "function") {
				props.ref(el)
			}
		},
	})

	return (
		<Combobox.Content
			{...finalProps}
			{...stylex.attrs(styles.content, local.styles)}
		/>
	)
}

// Arrow Component

export type ArrowProps = ComponentProps<typeof Combobox.Arrow> & {
	styles?: StyleXStyles
}

export function Arrow(props: ArrowProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Arrow
			{...others}
			{...stylex.attrs(styles.arrow, local.styles)}
		/>
	)
}

// Listbox Component

export type ListboxProps = ComponentProps<typeof Combobox.Listbox<"ul">> & {
	styles?: StyleXStyles
}

export function Listbox(props: ListboxProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.Listbox
			{...others}
			{...stylex.attrs(styles.listbox, local.styles)}
		/>
	)
}

export type ItemProps = ComponentProps<typeof Combobox.Item<"li">> & {
	styles?: StyleXStyles
}

export function Item(props: ItemProps): JSX.Element {
	const scrollContext = useComboboxScroll()

	const [itemRef, setItemRef] = createSignal<HTMLElement>()

	const [local, others] = splitProps(props, ["styles"])
	const finalProps = mergeProps(others, {
		ref(el: HTMLLIElement) {
			setItemRef(el)

			if (typeof props.ref === "function") {
				props.ref(el)
			}
		},
	})

	createEffect(() => {
		const ref = itemRef()
		if (!ref) return

		const observer = new MutationObserver(() => {
			if (Object.hasOwn(ref.dataset, "highlighted")) {
				scrollContext.setHighlightedItem(ref)
			} else if (scrollContext.highlightedItem() === ref) {
				scrollContext.setHighlightedItem()
			}
		})

		observer.observe(ref, {
			attributes: true,
			attributeFilter: ["data-highlighted"],
		})

		onCleanup(() => {
			observer.disconnect()

			if (scrollContext.highlightedItem() === ref) {
				scrollContext.setHighlightedItem()
			}
		})
	})

	return (
		<Combobox.Item
			{...finalProps}
			{...stylex.attrs(styles.item, local.styles)}
		/>
	)
}

export type ItemLabelProps = ComponentProps<
	typeof Combobox.ItemLabel<"div">
> & { styles?: StyleXStyles }

export function ItemLabel(props: ItemLabelProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.ItemLabel
			{...others}
			{...stylex.attrs(styles.itemLabel, local.styles)}
		/>
	)
}

export type ItemIndicatorProps = ComponentProps<
	typeof Combobox.ItemIndicator<"div">
> & { styles?: StyleXStyles }

export function ItemIndicator(props: ItemIndicatorProps): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Combobox.ItemIndicator
			{...others}
			{...stylex.attrs(styles.itemLabel, local.styles)}
		/>
	)
}

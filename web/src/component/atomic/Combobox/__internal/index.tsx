import { Combobox } from "@kobalte/core"
import { createSignal, mergeProps, createEffect, onCleanup } from "solid-js"
import type { ComponentProps, JSX, ValidComponent } from "solid-js"
import { CaretSortIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { tw } from "~/utils"

import {
	ComboboxScrollContext,
	createComboboxScrollContext,
	useComboboxScroll,
} from "./scroll"

function ComboboxScrollProvider(props: { children: JSX.Element }) {
	let contextValue = createComboboxScrollContext()
	return (
		<ComboboxScrollContext.Provider value={contextValue}>
			{props.children}
		</ComboboxScrollContext.Provider>
	)
}

export function Root<Opt, OptGroup>(
	props: ComponentProps<typeof Combobox.Root<Opt, OptGroup, "div">>,
): JSX.Element {
	return (
		<ComboboxScrollProvider>
			<Combobox.Root {...props} />
		</ComboboxScrollProvider>
	)
}

// Label Component
export const LABEL_CLASS = tw(`

`)

export type LabelProps = ComponentProps<typeof Combobox.Label>

export function Label(props: LabelProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(LABEL_CLASS, props["class"] as string)
		},
	})

	return <Combobox.Label {...finalProps} />
}

// Control Component
export const CONTROL_CLASS = tw(`
  grid grid-cols-1 relative isolate
`)

export type ControlProps = ComponentProps<typeof Combobox.Control<"div">>

export function Control(props: ControlProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(CONTROL_CLASS, props.class)
		},
	})

	return <Combobox.Control {...finalProps} />
}

// TODO: Replace it with common input

const INPUT_BASE_CLASS = tw(`
	text-slate-900 focus:text-primary
	bg-primary
	border border-slate-300
  disabled:bg-slate-100
  rounded-sm
  outline-[1.5px]
  not-disabled:hover:outline-reimu-500
  focus:outline-reimu-600
  outline-transparent -outline-offset-1
  aria-invalid:border-reimu-600
  transition-all duration-100
`)

export const INPUT_CLASS = INPUT_BASE_CLASS.concat(
	// @tw
	" px-2 h-8 ",
)

export type InputProps<T extends ValidComponent = "input"> = ComponentProps<
	typeof Combobox.Input<T>
>

export function Input(props: InputProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(INPUT_CLASS, props.class)
		},
	})

	return <Combobox.Input {...finalProps} />
}

export function MultiInputContainer(props: ComponentProps<"ul">): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(INPUT_BASE_CLASS, "min-h-fit h-8", props.class)
		},
	})

	return <ul {...finalProps}></ul>
}

const RESET_INPUT_CLASS = "focus:outline-none"

export function MultiInput(props: InputProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(RESET_INPUT_CLASS, props.class)
		},
	})

	return <Combobox.Input {...finalProps} />
}

export const HiddenSelect = Combobox.HiddenSelect

// Trigger Component
export const TRIGGER_CLASS = tw(`
	absolute z-10 right-0
	h-full mx-2
`)

export type TriggerProps = ComponentProps<typeof Combobox.Trigger>

export function Trigger(props: TriggerProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(TRIGGER_CLASS, props["class"] as string)
		},
	})

	return <Combobox.Trigger {...finalProps} />
}

// Icon Component
export const ICON_CLASS = tw(`

`)

export type IconProps = ComponentProps<typeof Combobox.Icon>

export function Icon(props: IconProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(ICON_CLASS, props["class"] as string)
		},
	})

	return (
		<Combobox.Icon {...finalProps}>
			<CaretSortIcon class="size-5 text-secondary" />
		</Combobox.Icon>
	)
}

// Description Component
export const DESCRIPTION_CLASS = tw(`
  text-sm text-slate-600 mt-1
`)

export type DescriptionProps = ComponentProps<typeof Combobox.Description>

export function Description(props: DescriptionProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(DESCRIPTION_CLASS, props["class"] as string)
		},
	})

	return <Combobox.Description {...finalProps} />
}

// ErrorMessage Component
export const ERROR_MESSAGE_CLASS = tw(`
  text-sm text-reimu-600 mt-1
`)

export type ErrorMessageProps = ComponentProps<typeof Combobox.ErrorMessage>

export function ErrorMessage(props: ErrorMessageProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(ERROR_MESSAGE_CLASS, props["class"] as string)
		},
	})

	return <Combobox.ErrorMessage {...finalProps} />
}

// Portal Component
export const PORTAL_CLASS = tw(`
  z-50
`)

export type PortalProps = ComponentProps<typeof Combobox.Portal>

export function Portal(props: PortalProps): JSX.Element {
	return <Combobox.Portal {...props} />
}

// Content Component
export const CONTENT_CLASS = tw(`
  bg-white
  border border-slate-300
  rounded-sm
  shadow-lg
  max-h-64
  overflow-auto

`)

export type ContentProps = ComponentProps<typeof Combobox.Content>

export function Content(props: ContentProps): JSX.Element {
	const scrollContext = useComboboxScroll()

	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(CONTENT_CLASS, props["class"] as string)
		},
		ref(el: HTMLDivElement) {
			scrollContext.setScrollContainer(el)
			if (typeof props.ref === "function") {
				;(props.ref as (el: HTMLDivElement) => void)(el)
			}
		},
	})

	return <Combobox.Content {...finalProps} />
}

// Arrow Component
export const ARROW_CLASS = tw(`
  fill-white stroke-slate-300
`)

export type ArrowProps = ComponentProps<typeof Combobox.Arrow>

export function Arrow(props: ArrowProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(ARROW_CLASS, props["class"] as string)
		},
	})

	return <Combobox.Arrow {...finalProps} />
}

// Listbox Component
export const LISTBOX_CLASS = tw(`
  outline-none
`)

export type ListboxProps = ComponentProps<typeof Combobox.Listbox<"ul">>

export function Listbox(props: ListboxProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(LISTBOX_CLASS, props.class)
		},
	})

	return <Combobox.Listbox {...finalProps} />
}

export const ITEM_CLASS = tw(`
	flex place-content-between
	items-baseline
	px-2 py-2

	border-l-2 border-transparent
	transition-all duration-150
	hover:bg-slate-100 hover:border-reimu-600
	data-highlighted:bg-slate-100 data-highlighted:border-reimu-600
	`)

export type ItemProps = ComponentProps<typeof Combobox.Item<"li">>

export function Item(props: ItemProps): JSX.Element {
	const scrollContext = useComboboxScroll()

	let [itemRef, setItemRef] = createSignal<HTMLElement>()

	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(ITEM_CLASS, props.class)
		},
		ref(el: HTMLLIElement) {
			setItemRef(el)

			if (typeof props.ref === "function") {
				props.ref(el)
			}
		},
	})

	createEffect(() => {
		let ref = itemRef()
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

	return <Combobox.Item {...finalProps} />
}

export const ITEM_LABEL_CLASS = tw(`
	text-slate-900
`)

export type ItemLabelProps = ComponentProps<typeof Combobox.ItemLabel<"div">>

export function ItemLabel(props: ItemLabelProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(ITEM_LABEL_CLASS, props.class)
		},
	})

	return <Combobox.ItemLabel {...finalProps} />
}

export const ITEM_INDICATOR_CLASS = tw(`
	text-primary
`)

export type ItemIndicatorProps = ComponentProps<
	typeof Combobox.ItemIndicator<"div">
>

export function ItemIndicator(props: ItemIndicatorProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(ITEM_LABEL_CLASS, props.class)
		},
	})

	return <Combobox.ItemIndicator {...finalProps} />
}

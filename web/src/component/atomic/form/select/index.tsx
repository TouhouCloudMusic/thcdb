import * as K_Select from "@kobalte/core/select"
import type { ComponentProps, JSX } from "solid-js"
import { mergeProps } from "solid-js"
import { CaretSortIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { INPUT_CLASSNAME } from "../../Input"

const Root = K_Select.Root

const TRIGGER_CLASSNAME = twMerge(
	INPUT_CLASSNAME,
	"grid grid-cols-[1fr_auto] items-center gap-2 px-2 text-left font-light",
)
type TriggerProps = ComponentProps<typeof K_Select.Trigger>
function Trigger(props: TriggerProps) {
	const finalProps = mergeProps(props, {
		get class() {
			// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
			return twMerge(TRIGGER_CLASSNAME, props["class"] as string)
		},
	})

	return <K_Select.Trigger {...finalProps} />
}

const VALUE_CLASSNAME = "truncate"
type ValueProps<Option> = ComponentProps<typeof K_Select.Value<Option>>
function Value<Option>(props: ValueProps<Option>) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(VALUE_CLASSNAME, props.class)
		},
	})

	return <K_Select.Value {...finalProps} />
}

type IconProps = ComponentProps<typeof K_Select.Icon>
function Icon(props: IconProps): JSX.Element {
	return (
		<K_Select.Icon {...props}>
			<CaretSortIcon class="size-4 text-secondary" />
		</K_Select.Icon>
	)
}

type PortalProps = ComponentProps<typeof K_Select.Portal>
function Portal(props: PortalProps): JSX.Element {
	return <K_Select.Portal {...props} />
}

const CONTENT_CLASSNAME =
	"z-50 max-h-64 rounded-sm border border-slate-300 bg-white shadow-sm"
type ContentProps = ComponentProps<typeof K_Select.Content>
function Content(props: ContentProps): JSX.Element {
	const finalProps = mergeProps(props, {
		sameWidth: true,
		get class() {
			// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
			return twMerge(CONTENT_CLASSNAME, props["class"] as string)
		},
	})

	return <K_Select.Content {...finalProps} />
}

const LISTBOX_CLASSNAME = "p-1"
type ListboxProps = ComponentProps<typeof K_Select.Listbox>
function Listbox(props: ListboxProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
			return twMerge(LISTBOX_CLASSNAME, props["class"] as string)
		},
	})

	return <K_Select.Listbox {...finalProps} />
}

const ITEM_CLASSNAME =
	"cursor-default rounded-xs px-2 py-1.5 text-sm text-slate-900 select-none data-[highlighted]:bg-slate-100 data-[highlighted]:outline-none"
type ItemProps = ComponentProps<typeof K_Select.Item>
function Item(props: ItemProps): JSX.Element {
	const finalProps = mergeProps(props, {
		get class() {
			// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
			return twMerge(ITEM_CLASSNAME, props["class"] as string)
		},
	})

	return <K_Select.Item {...finalProps} />
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

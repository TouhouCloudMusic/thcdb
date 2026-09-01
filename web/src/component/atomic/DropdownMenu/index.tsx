import * as K_DropdownMenu from "@kobalte/core/dropdown-menu"
import type { ComponentProps } from "solid-js"
import { mergeProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { ButtonClass_new } from "~/component/atomic/button"

const Root = K_DropdownMenu.Root

const TRIGGER_CLASSNAME = ButtonClass_new({
	variant: "Secondary",
	size: "Sm",
	class: "size-8 p-0 ring-0 shadow-none data-expanded:bg-slate-200",
})
type TriggerProps = ComponentProps<typeof K_DropdownMenu.Trigger>
function Trigger(props: TriggerProps) {
	const finalProps = mergeProps({ type: "button" as const }, props, {
		get class() {
			return twMerge(
				TRIGGER_CLASSNAME,
				typeof props["class"] === "string" ? props["class"] : undefined,
			)
		},
	})

	return <K_DropdownMenu.Trigger {...finalProps} />
}

const Icon = K_DropdownMenu.Icon
const Portal = K_DropdownMenu.Portal

const CONTENT_CLASSNAME =
	"z-50 origin-(--kb-popper-content-transform-origin) rounded-sm border border-slate-300 bg-white p-1 shadow-lg shadow-slate-950/10 outline-none animate-scale-down data-expanded:animate-scale-up"
type ContentProps = ComponentProps<typeof K_DropdownMenu.Content>
function Content(props: ContentProps) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(
				CONTENT_CLASSNAME,
				typeof props["class"] === "string" ? props["class"] : undefined,
			)
		},
	})

	return <K_DropdownMenu.Content {...finalProps} />
}

const ITEM_CLASSNAME =
	"flex cursor-default items-center rounded-xs px-2 py-1.5 text-sm text-slate-900 select-none outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[highlighted]:bg-slate-100"
type ItemProps = ComponentProps<typeof K_DropdownMenu.Item>
function Item(props: ItemProps) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(
				ITEM_CLASSNAME,
				typeof props["class"] === "string" ? props["class"] : undefined,
			)
		},
	})

	return <K_DropdownMenu.Item {...finalProps} />
}

const SEPARATOR_CLASSNAME = "my-1 h-px border-0 bg-slate-200"
type SeparatorProps = ComponentProps<typeof K_DropdownMenu.Separator>
function Separator(props: SeparatorProps) {
	const finalProps = mergeProps(props, {
		get class() {
			return twMerge(
				SEPARATOR_CLASSNAME,
				typeof props["class"] === "string" ? props["class"] : undefined,
			)
		},
	})

	return <K_DropdownMenu.Separator {...finalProps} />
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

import type { LinkComponentProps } from "@tanstack/solid-router"
import { Link as RouterLink } from "@tanstack/solid-router"
import { createMemo, splitProps } from "solid-js"
import type { ParentProps, Ref } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Button, ButtonClass_new } from "../atomic/button"
import type { Props as ButtonProps } from "../atomic/button"

export function Sidebar(
	props: ParentProps & {
		class?: string
		ref?: Ref<HTMLDivElement> | undefined
	},
) {
	return (
		<div
			ref={props.ref}
			tabindex={-1}
			class={twMerge(
				"ml-auto flex h-full w-60 overflow-auto border-t border-t-reimu-600 bg-primary",
				props.class,
			)}
		>
			{props.children}
		</div>
	)
}

type ListItemStyleProps = Pick<
	ButtonProps,
	"class" | "size" | "color" | "variant"
>
type ListItemLinkProps = ParentProps<
	LinkComponentProps<"a"> & ListItemStyleProps
>
type ListItemButtonProps = ParentProps<ButtonProps>
type ListItemProps = ListItemLinkProps | ListItemButtonProps
type ListItemOtherProps = Omit<
	ListItemProps,
	"class" | "size" | "color" | "variant"
>
type ListItemLinkOtherProps = Omit<
	ListItemLinkProps,
	"class" | "size" | "color" | "variant"
>

const isLinkProps = (
	value: ListItemOtherProps,
): value is ListItemLinkOtherProps => "to" in value

const LIST_ITEM_CLASS = `
  flex items-center justify-start text-left w-full
  py-1 px-1
  font-light font-inter text-sm text-slate-700
  *:mx-1
  [&_svg]:size-4 [&_svg]:text-slate-600
`
export function ListItem(props: ListItemProps) {
	const [style_props, other_props] = splitProps(props, [
		"class",
		"size",
		"color",
		"variant",
	])
	const tw_class = createMemo(() =>
		twMerge(
			ButtonClass_new({
				variant: "Tertiary",
				size: style_props.size,
				color: style_props.color,
			}),
			LIST_ITEM_CLASS,
			style_props.class,
		),
	)

	if (isLinkProps(other_props)) {
		return (
			<RouterLink
				{...other_props}
				class={tw_class()}
			/>
		)
	}

	return (
		<Button
			{...other_props}
			variant="Tertiary"
			size={style_props.size}
			color={style_props.color}
			class={tw_class()}
		/>
	)
}

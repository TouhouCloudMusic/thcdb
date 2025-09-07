import type { PolymorphicProps } from "@kobalte/core"
import { Popover } from "@kobalte/core/popover"
import type { PopoverArrowProps } from "@kobalte/core/popover"
import type {
	PopoverCloseButtonProps,
	PopoverContentProps,
	PopoverDescriptionProps,
	PopoverTitleProps,
	PopoverRootProps,
} from "@kobalte/core/popover"
import { mergeProps } from "solid-js"
import type { ValidComponent } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Button } from "~/components/atomic/button"

export type RootProps = PopoverRootProps

export function Root(props: RootProps) {
	return <Popover {...props} />
}

export const Trigger = Popover.Trigger
export const Portal = Popover.Portal

export type ContentProps<T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	PopoverContentProps<T>
>

export function Content<T extends ValidComponent = "div">(
	props: ContentProps<T>,
) {
	const CLASS = `
    fixed z-50 p-4
    bg-primary
    border-1 border-slate-200 border-b-[1.5px]
    shadow-sm
    rounded
    animate-scale-down data-expanded:animate-scale-up
    origin-(--kb-popper-content-transform-origin)
  `

	let local_props = mergeProps(props, {
		get class() {
			return twMerge(CLASS, props["class"])
		},
	})

	return <Popover.Content {...local_props} />
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

type CloseButtonProps<T extends ValidComponent = typeof Button> =
	PolymorphicProps<T, PopoverCloseButtonProps<"button">> & {
		as?: T
	}

export function CloseButton<T extends ValidComponent = typeof Button>(
	props: CloseButtonProps<T>,
) {
	return (
		<Popover.CloseButton
			as={Button}
			{...props}
		/>
	)
}

export function Title<T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, PopoverTitleProps<T>>,
) {
	const CLASS = "font-medium"

	let local_props = mergeProps(props, {
		get class() {
			return twMerge(CLASS, props["class"])
		},
	})

	return <Popover.Title {...local_props} />
}

export function Arrow(props: PolymorphicProps<"div", PopoverArrowProps>) {
	return <Popover.Arrow {...props} />
}

export function Description<T extends ValidComponent = "p">(
	props: PolymorphicProps<T, PopoverDescriptionProps<T>>,
) {
	const CLASS = "my-2 pr-2 text-sm text-slate-800"

	let local_props = mergeProps(props, {
		get class() {
			return twMerge(CLASS, props["class"])
		},
	})
	return <Popover.Description {...local_props} />
}

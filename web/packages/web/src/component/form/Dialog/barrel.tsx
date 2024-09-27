import { Dialog, type PolymorphicProps } from "@kobalte/core"
import {
	type DialogContentProps,
	type DialogDescriptionProps,
	type DialogOverlayProps,
	type DialogRootProps,
	type DialogTitleProps,
} from "@kobalte/core/dialog"
import {
	createMemo,
	type JSX,
	type ParentProps,
	type ValidComponent,
} from "solid-js"
import { twMerge } from "tailwind-merge"

export const Root = (props: DialogRootProps) => {
	return <Dialog.Root {...props} />
}

export const Trigger = Dialog.Trigger

export const Portal = Dialog.Portal

export const Overlay = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DialogOverlayProps<T>>
) => {
	const className = createMemo(() =>
		props["class"] ?
			twMerge(Overlay.className, props["class"])
		:	Overlay.className
	)

	return (
		<Dialog.Overlay
			{...props}
			class={className()}
		/>
	)
}

Overlay.className = "fixed inset-0 z-50 bg-slate-900/10"

export const Content = <T extends ValidComponent = "div">(
	props: PolymorphicProps<T, DialogContentProps<T>>
) => {
	const className = createMemo(() =>
		props["class"] ?
			twMerge(Content.className, props["class"])
		:	Content.className
	)

	return (
		<Dialog.Content
			{...props}
			class={className()}
		/>
	)
}

Content.className =
	"bg-primary fixed inset-0 z-50 m-auto rounded-md p-4 shadow-md shadow-gray-200"

export const CloseButton = Dialog.CloseButton

export const Title = <T extends ValidComponent = "h2">(
	props: PolymorphicProps<T, DialogTitleProps<T>>
) => {
	const className = createMemo(() =>
		props["class"] ? twMerge(Title.className, props["class"]) : Title.className
	)
	return (
		<Dialog.Title
			{...props}
			class={className()}
		/>
	)
}
// @tw
Title.className = "font-medium"

export const Description = <T extends ValidComponent = "p">(
	props: PolymorphicProps<T, DialogDescriptionProps<T>>
) => {
	const className = createMemo(() =>
		props["class"] ?
			twMerge(Description.className, props["class"])
		:	Description.className
	)
	return (
		<Dialog.Description
			{...props}
			class={className()}
		/>
	)
}

Description.className = "mt-2 pr-2 text-sm text-gray-800"

export function Layout(
	props: ParentProps & {
		trigger: JSX.Element
	}
) {
	return (
		<Root>
			<Trigger>{props.trigger}</Trigger>
			<Portal>
				<Overlay />
				{props.children}
			</Portal>
		</Root>
	)
}

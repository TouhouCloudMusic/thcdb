import type { JSX, ParentProps } from "solid-js"
import { mergeProps } from "solid-js"
import { MagnifyingGlassIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Dialog } from "~/component/dialog"

export { Root } from "~/component/dialog/__internal"
export type { RootProps } from "~/component/dialog/__internal"

export type LabelProps = {
	children: JSX.Element
	class?: string
}

export function Label(props: LabelProps) {
	return (
		<Dialog.Title
			class={twMerge(
				"text-3xl font-extralight tracking-tight text-primary",
				props.class,
			)}
		>
			{props.children}
		</Dialog.Title>
	)
}

export type InputProps = JSX.InputHTMLAttributes<HTMLInputElement>

const INPUT_CLASS = `
pl-7 py-1
border-b border-slate-400 hover:border-reimu-600 focus:border-reimu-600
placeholder:font-light placeholder:text-tertiary outline-none
tracking-tighter
transition-all duration-150
`

export function Input(props: InputProps) {
	const inputProps = mergeProps(props, {
		get class() {
			return twMerge(INPUT_CLASS, props.class)
		},
	})
	return (
		<div class="relative">
			<MagnifyingGlassIcon class="absolute z-10 mx-auto size-4 w-8 self-center text-tertiary" />
			<input {...inputProps} />
		</div>
	)
}

const CONTENT_CLASS =
	"flex min-h-128 flex-col h-192 w-128 max-w-[90vw] rounded p-6"

export function Content(props: Dialog.ContentProps) {
	const finalProps = mergeProps(props, {
		get class() {
			return props.class ? twMerge(CONTENT_CLASS, props.class) : CONTENT_CLASS
		},
	})
	return (
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content {...finalProps} />
		</Dialog.Portal>
	)
}

export type ListProps = JSX.HTMLAttributes<HTMLUListElement>
const LIST_CLASS = "overflow-auto has-first:border-y border-slate-300 mb-4"
export function List(props: ListProps) {
	const listProps = mergeProps(props, {
		get class() {
			return props.class ? twMerge(LIST_CLASS, props.class) : LIST_CLASS
		},
	})
	return <ul {...listProps}></ul>
}

export function Item(props: ParentProps) {
	return (
		<li class="group relative isolate border-slate-300 p-4 text-left transition-all duration-150 not-first:border-t last:border-b hover:bg-[#f6f7f8] active:bg-[#f0f1f2]">
			{props.children}
		</li>
	)
}

export function ItemIndicator() {
	return (
		<div class="absolute top-0 left-0 z-20 h-full w-px origin-left scale-y-0 transform-gpu bg-[#ef5d5d] transition-all ease-in-out group-hover:scale-y-100"></div>
	)
}

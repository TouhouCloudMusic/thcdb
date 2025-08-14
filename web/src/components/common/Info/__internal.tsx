import type { ComponentProps, JSX, ParentProps } from "solid-js"
import { mergeProps, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Intersperse } from "../Intersperse"

type ListProps<T> = {
	items: T[] | null | undefined
	separator?: string | JSX.Element
	children: (item: T, index: () => number) => JSX.Element
} & Omit<ComponentProps<"ul">, "children">

const LIST_CLASS = "flex flex-wrap"

export function List<T>(props: ListProps<T>) {
	const [listProps, ulProps] = splitProps(props, [
		"items",
		"separator",
		"children",
	])
	const ulProps2 = mergeProps(ulProps, {
		get class() {
			return props.class ? twMerge(LIST_CLASS, props.class) : LIST_CLASS
		},
	})
	return (
		<ul {...ulProps2}>
			<Intersperse
				each={listProps.items}
				separator={listProps.separator ?? <>,&nbsp;</>}
			>
				{listProps.children}
			</Intersperse>
		</ul>
	)
}

type LabelProps = ParentProps<ComponentProps<"div">>

const LABEL_CLASS = "text-sm text-tertiary tracking-wide"

export function Label(props: LabelProps) {
	let finalProps = mergeProps(props, {
		get class() {
			if (props.class) {
				return twMerge(LABEL_CLASS, props.class)
			}

			return LABEL_CLASS
		},
	})
	return <div {...finalProps}></div>
}

type DetailProps = ParentProps<ComponentProps<"div">>

const DETAIL_CLASS = "text-slate-1000"

export function Detail(props: DetailProps) {
	let finalProps = mergeProps(props, {
		get class() {
			if (props.class) {
				return twMerge(DETAIL_CLASS, props.class)
			}

			return DETAIL_CLASS
		},
	})
	return <div {...finalProps}></div>
}

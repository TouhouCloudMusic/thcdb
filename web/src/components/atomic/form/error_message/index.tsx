import type { JSX } from "solid-js"
import { mergeProps, Show } from "solid-js"
import { twMerge } from "tailwind-merge"

export const ERROR_MESSAGE_CLASSNAME = "text-reimu-700 text-sm mt-2"

export type ErrorMessageProps = Omit<
	JSX.HTMLAttributes<HTMLSpanElement>,
	"children"
> & {
	children?: string
}

export function ErrorMessage(props: ErrorMessageProps): JSX.Element {
	const localProps = mergeProps(props, {
		get class() {
			return props.class
				? twMerge(ERROR_MESSAGE_CLASSNAME, props.class)
				: ERROR_MESSAGE_CLASSNAME
		},
	})
	return (
		<Show when={props.children}>
			<span {...localProps}>{props.children}</span>
		</Show>
	)
}

import type { JSX } from "solid-js"
import { mergeProps, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { twMerge } from "tailwind-merge"

export const ERROR_MESSAGE_CLASSNAME = "text-reimu-600 text-sm mt-2"

export type ErrorMessageProps<T extends "span" | "li"> = Omit<
	JSX.HTMLAttributes<T>,
	"children"
> & {
	children?: string
	as?: T
}

export function ErrorMessage<T extends "span" | "li" = "span">(
	props: ErrorMessageProps<T>,
): JSX.Element {
	const localProps = mergeProps(props, {
		get class() {
			return props.class
				? twMerge(ERROR_MESSAGE_CLASSNAME, props.class)
				: ERROR_MESSAGE_CLASSNAME
		},
	})

	return (
		<Show when={props.children}>
			{/** @ts-expect-error */}
			<Dynamic
				component={props.as ?? "span"}
				{...localProps}
			>
				{props.children}
			</Dynamic>
		</Show>
	)
}

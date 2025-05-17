import { type JSX, mergeProps, Show } from "solid-js"
import { twMerge } from "tailwind-merge"

export const ERROR_MESSAGE_CLASSNAME = "text-reimu-700 text-sm mt-2"

export type ErrorMessageProps = Omit<
	JSX.HTMLAttributes<HTMLSpanElement>,
	"children"
> & {
	message: string | undefined
}

export function ErrorMessage(props: ErrorMessageProps) {
	const localProps = mergeProps(props, {
		get class() {
			return props.class ?
					twMerge(ERROR_MESSAGE_CLASSNAME, props.class)
				:	ERROR_MESSAGE_CLASSNAME
		},
	})
	return (
		<Show when={props.message}>
			<span {...localProps}>{props.message}</span>
		</Show>
	)
}

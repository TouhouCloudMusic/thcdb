import { Show } from "solid-js"

type ErrorTextProps = {
	text?: string | undefined
	showWhen?: boolean
}

/**
 * @deprecated
 */
export function ErrorText(props: ErrorTextProps) {
	return (
		<Show
			when={
				props.showWhen ?? (props.text !== undefined && props.text.length > 0)
			}>
			<p class="text-reimu-700 text-sm">{props.text}</p>
		</Show>
	)
}

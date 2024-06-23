import { Show } from "solid-js"

type ErrorTextProps = {
	text?: string
	showWhen?: boolean
}

export function ErrorText(props: ErrorTextProps) {
	return (
		<Show
			when={
				props.showWhen ?? (props.text !== undefined && props.text.length > 0)
			}>
			<p class="text-sm text-red-700">{props.text}</p>
		</Show>
	)
}

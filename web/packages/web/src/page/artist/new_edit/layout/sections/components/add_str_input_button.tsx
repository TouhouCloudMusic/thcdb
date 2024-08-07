import { type JSX } from "solid-js"
import { Button } from "~/component/button"

export function AddStringInputButton(props: {
	onClick: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined
	label: string
}) {
	return (
		<Button.Borderless
			type="button"
			onClick={props.onClick}
			class="mx-1 px-1 text-sm text-gray-700">
			{props.label}
		</Button.Borderless>
	)
}

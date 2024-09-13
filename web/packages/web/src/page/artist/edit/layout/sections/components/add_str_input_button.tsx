import { type JSX } from "solid-js"
import { TertiaryButton } from "~/component/button"

export function AddStringInputButton(props: {
	onClick?: JSX.EventHandlerUnion<HTMLButtonElement, MouseEvent> | undefined
	label: string
}) {
	return (
		<TertiaryButton
			type="button"
			onClick={props.onClick}
			class="mx-1 px-1 text-sm text-gray-700">
			{props.label}
		</TertiaryButton>
	)
}

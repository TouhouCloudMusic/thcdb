import { type JSX } from "solid-js"
import { Cross1Icon, type IconProps } from "solid-radix-icons"
import { Button } from "~/component/button/index.ts"

interface DeleteButtonProps {
	buttonProps: JSX.ButtonHTMLAttributes<HTMLButtonElement>
	iconProps: IconProps
}

export function DeleteButton(props: DeleteButtonProps) {
	return (
		<Button.Warning {...props.buttonProps}>
			<Cross1Icon {...props.iconProps} />
		</Button.Warning>
	)
}

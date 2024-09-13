import { Cross1Icon } from "solid-radix-icons"
import { type ButtonProps, PrimaryButton } from "~/component/button/index.tsx"

export function DeleteButton(props: ButtonProps) {
	return (
		<PrimaryButton
			{...props}
			color="warning">
			<Cross1Icon />
		</PrimaryButton>
	)
}

import { useLingui } from "@lingui/solid/macro"
import { twJoin, twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"

type Props = {
	class?: string
	submitting: boolean
	disabled?: boolean
	onBack?: () => void
	onSubmit?: () => void
}

export function FormActionBar(props: Props) {
	const { t } = useLingui()
	const handleBack = () => {
		if (props.onBack) {
			props.onBack()
		} else {
			history.back()
		}
	}

	const submitLabel = t`Submit`
	const submittingLabel = t`Submitting`
	const backLabel = t`Back`

	return (
		<div
			class={twMerge(
				"sticky bottom-0 col-span-full flex justify-end border-t border-slate-300 bg-white p-4",
				props.class,
			)}
		>
			<div class="grid grid-cols-2 gap-2">
				<Button
					variant="Tertiary"
					class="px-3 py-1.5"
					onClick={handleBack}
				>
					{backLabel}
				</Button>
				<Button
					variant="Primary"
					type="submit"
					class={twJoin(
						"px-3 py-1.5",
						props.submitting ? "cursor-wait opacity-80" : "",
					)}
					disabled={props.disabled}
					onClick={props.onSubmit}
				>
					{props.submitting ? submittingLabel : submitLabel}
				</Button>
			</div>
		</div>
	)
}

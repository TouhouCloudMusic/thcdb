import { Dialog } from "@kobalte/core"
import {
	PrimaryButton,
	SecondaryButton,
	TertiaryButton,
} from "../button/index.tsx"
import { ArrowPathIcon } from "../icons/heroicons/24/outline.tsx"

export function ResetFieldDialogTrigger(props: {
	modal?: boolean
	fieldName: string
	onReset: () => void
}) {
	return (
		<Dialog.Root modal={props.modal ?? false}>
			<Dialog.Trigger
				size="xs"
				class="mr-0.5 aspect-square h-full p-1.5"
				aria-label={`Reset ${props.fieldName} field to initial state`}
				as={TertiaryButton}>
				<ArrowPathIcon />
			</Dialog.Trigger>
			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 z-50 flex place-content-center bg-slate-900/10" />
				<div class="fixed inset-0 z-50 flex place-content-center">
					<Dialog.Content class="bg-primary z-50 m-auto grid size-fit grid-cols-3 gap-x-2 rounded-md p-4 shadow-md shadow-gray-200">
						<Dialog.Title class="col-span-full font-medium">
							Reset field?
						</Dialog.Title>
						<Dialog.Description class="col-span-full mt-2 pr-2 text-sm text-gray-800">
							This will reset {props.fieldName} field to its initial state.
						</Dialog.Description>
						<div class="col-span-2 col-start-2 mt-6 grid grid-cols-subgrid">
							<Dialog.CloseButton
								class=""
								color="warning"
								size="sm"
								onClick={props.onReset}
								as={SecondaryButton}>
								Reset
							</Dialog.CloseButton>
							<Dialog.CloseButton
								size="sm"
								as={PrimaryButton}>
								No
							</Dialog.CloseButton>
						</div>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

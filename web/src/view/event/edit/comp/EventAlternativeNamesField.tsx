import { Field, FieldArray, getErrors, insert, remove } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"

import { useEventForm } from "../context"

type Props = {
	class?: string
}

export function EventAlternativeNamesField(props: Props) {
	const { formStore } = useEventForm()

	const addAltName = () => {
		insert(formStore, {
			path: ["data", "alternative_names"],
		})
	}

	const removeAltNameAt = (index: number) => () => {
		remove(formStore, { path: ["data", "alternative_names"], at: index })
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Alternative Names</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addAltName}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(formStore, { path: ["data", "alternative_names"] })}
			/>
			<FieldArray
				of={formStore}
				path={["data", "alternative_names"]}
			>
				{(fieldArray) => (
					<ul class="flex h-full flex-col gap-2">
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li class="flex gap-2">
									<Field
										of={formStore}
										path={["data", "alternative_names", idx()]}
									>
										{(field) => (
											<InputField.Root class="grow">
												<InputField.Input
													{...field.props}
													value={field.input ?? ""}
													placeholder="Name"
												/>
												<InputField.Error>
													{field.errors ? field.errors[0] : undefined}
												</InputField.Error>
											</InputField.Root>
										)}
									</Field>
									<Button
										variant="Tertiary"
										size="Sm"
										onClick={removeAltNameAt(idx())}
									>
										<Cross1Icon />
									</Button>
								</li>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}

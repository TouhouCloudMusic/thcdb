import { Field, getInput, setInput } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import { For } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"

import { useEventForm } from "../context"

type Props = {
	class?: string
}

type LocationFieldKey = "country" | "province" | "city"

const DESCRIPTORS: { key: LocationFieldKey; label: string }[] = [
	{ key: "country", label: "Country / Region" },
	{ key: "province", label: "Province" },
	{ key: "city", label: "City" },
]

function sanitize(input: string): string | undefined {
	const trimmed = input.trim()
	return trimmed === "" ? undefined : trimmed
}

export function EventLocationField(props: Props) {
	const { formStore } = useEventForm()

	return (
		<div class={twMerge("flex flex-col gap-2", props.class)}>
			<FormComp.Label>
				<Trans>Location</Trans>
			</FormComp.Label>
			<div class="flex flex-wrap gap-4">
				<For each={DESCRIPTORS}>
					{(descriptor) => (
						<Field
							of={formStore}
							path={["data", "location", descriptor.key]}
						>
							{(field) => {
								const handleInput: typeof field.props.onInput = (event) => {
									field.props.onInput?.(event)
									const nextValue = sanitize(event.currentTarget.value)
									const currentLocation = getInput(formStore, {
										path: ["data", "location"],
									}) ?? {
										country: undefined,
										province: undefined,
										city: undefined,
									}
									setInput(formStore, {
										path: ["data", "location"],
										input: {
											...currentLocation,
											[descriptor.key]: nextValue,
										},
									})
								}

								return (
									<InputField.Root class="min-w-48 flex-1">
										<InputField.Input
											{...field.props}
											value={field.input ?? ""}
											onInput={handleInput}
											placeholder={descriptor.label}
										/>
										<InputField.Error>
											{field.errors ? field.errors[0] : undefined}
										</InputField.Error>
									</InputField.Root>
								)
							}}
						</Field>
					)}
				</For>
			</div>
		</div>
	)
}

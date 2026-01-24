import { Field, setInput } from "@formisch/solid"
import { For, createMemo } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { DateWithPrecision } from "~/component/form/DateWithPrecision"

import { useArtistForm } from "../context"

type DateFieldKey = "start_date" | "end_date"

type DateFieldDescriptor = {
	key: DateFieldKey
	label: string
}

export function ArtistFormDateFields() {
	const { formStore } = useArtistForm()

	const fields: DateFieldDescriptor[] = [
		{ key: "start_date", label: "Start date" },
		{ key: "end_date", label: "End date" },
	]

	return (
		<For each={fields}>
			{(descriptor) => (
				<Field
					of={formStore}
					path={["data", descriptor.key]}
				>
					{(field) => {
						const currentValue = createMemo(() => {
							const input = field.input
							if (!input) return
							const { value, precision } = input
							if (!(value instanceof Date) || !precision) return
							return { value, precision }
						})

						return (
							<div>
								<FormComp.Label>{descriptor.label}</FormComp.Label>
								<div class="flex gap-4">
									<DateWithPrecision
										value={currentValue()}
										setValue={(value) =>
											setInput(formStore, {
												path: ["data", descriptor.key],
												// @ts-expect-error upstream formisch typing
												input: value,
											})
										}
									/>
								</div>
								<For each={field.errors ?? []}>
									{(error) => (
										<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
									)}
								</For>
							</div>
						)
					}}
				</Field>
			)}
		</For>
	)
}

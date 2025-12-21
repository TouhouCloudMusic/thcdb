import { Field, setInput } from "@formisch/solid"
import { useLingui } from "@lingui-solid/solid/macro"
import { For, createMemo } from "solid-js"
import { twMerge } from "tailwind-merge"

import { FormComp } from "~/component/atomic/form"
import { DateWithPrecision as DateWithPrecisionInput } from "~/component/form/DateWithPrecision"

import { useEventForm } from "../context"

type Props = {
	class?: string
}

type DateFieldKey = "start_date" | "end_date"

type DateFieldDescriptor = {
	key: DateFieldKey
	label: string
}

export function EventDateFields(props: Props) {
	const { formStore } = useEventForm()
	const { t } = useLingui()

	const fields: DateFieldDescriptor[] = [
		{ key: "start_date", label: t`Start date` },
		{ key: "end_date", label: t`End date` },
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
							<div
								class={twMerge("grid grid-cols-subgrid gap-y-2", props.class)}
							>
								<FormComp.Label class="col-span-full m-0">
									{descriptor.label}
								</FormComp.Label>
								<DateWithPrecisionInput
									value={currentValue()}
									setValue={(value) =>
										setInput(formStore, {
											path: ["data", descriptor.key],
											// @ts-expect-error TODO: Upstream error formisch error
											input: value,
										})
									}
								/>
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

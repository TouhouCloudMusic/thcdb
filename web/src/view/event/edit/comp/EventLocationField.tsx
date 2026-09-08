import { Field, getInput, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useEventForm } from "../context"

const styles = stylex.create({
	location: { display: "flex", flexDirection: "column", gap: px[8] },
	locationFields: { display: "flex", flexWrap: "wrap", gap: px[16] },
	locationInput: { minWidth: px[192], flex: "1" },
})

type Props = {
	styles?: StyleXStyles
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
	const { t } = useLingui()
	const { formStore } = useEventForm()

	return (
		<div {...stylex.attrs(styles.location, props.styles)}>
			<label {...stylex.attrs(formStyles.label)}>{t`Location`}</label>
			<div {...stylex.attrs(styles.locationFields)}>
				<For each={DESCRIPTORS}>
					{(descriptor) => (
						<Field
							of={formStore}
							path={["data", "location", descriptor.key]}
						>
							{(field) => {
								const handleInput: typeof field.props.onInput = (event) => {
									field.props.onInput(event)
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
									<InputField.Root styles={styles.locationInput}>
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

import { Fieldset } from "@ark-ui/solid"
import { Combobox } from "@kobalte/core/combobox"
import { insert, setValue } from "@modular-forms/solid"
import { type lang } from "@touhouclouddb/database/interfaces"
import { createMemo, createSignal, For, onMount, Show } from "solid-js"
import { CaretSortIcon } from "solid-radix-icons"
import { stringSimilarity } from "string-similarity-js"
import { TextInput } from "~/component/input/text_input.tsx"
import { Card, HStack, VStack } from "~/component/layout/index.tsx"
import { localizedLanguageArray } from "~/lib/form/schema/language.ts"
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx.ts"
import { useController } from "../../context.tsx"
import * as Style from "../style.ts"
import { AddStringInputButton } from "./components/add_str_input_button.tsx"

export function LocalizedName() {
	const { FieldArray, formStore } = useController()
	onMount(() => {
		setTimeout(() => {
			insert(formStore, "localized_name", {
				value: {
					name: "bar",
					language: "English",
				},
			})
			insert(formStore, "localized_name", {
				value: {
					name: "bar",
					language: "English",
				},
			})
		}, 50)
	})
	return (
		<FieldArray name="localized_name">
			{(fieldArray) => {
				const invalid = createMemo(() => fieldArray.error.length > 0)
				return (
					<Fieldset.Root
						name={fieldArray.name}
						invalid={invalid()}>
						<HStack>
							<Fieldset.Legend class={Style.label}>
								Localized Name
							</Fieldset.Legend>
							<AddStringInputButton
								onClick={() =>
									insert(formStore, "localized_name", {
										// @ts-expect-error
										value: {
											language: "English",
										},
									})
								}
								label="add localized name"
							/>
						</HStack>
						<ul class="flex flex-col gap-2">
							<For each={fieldArray.items}>
								{(_, index) => <LoacalizedNameField index={index()} />}
							</For>
						</ul>
						<Fieldset.ErrorText>{fieldArray.error}</Fieldset.ErrorText>
					</Fieldset.Root>
				)
			}}
		</FieldArray>
	)
}

function LoacalizedNameField(props: IndexComponentProps) {
	const { Field, formStore } = useController()

	return (
		<li class="flex w-fit flex-row gap-2">
			<Field name={`localized_name.${props.index}.name`}>
				{(field, props) => (
					<VStack>
						<TextInput
							value={field.value}
							placeholder="Name"
							{...props}
						/>
						<Show when={field.error}>
							<span class="text-sm text-red-700">{field.error}</span>
						</Show>
					</VStack>
				)}
			</Field>
			<Field name={`localized_name.${props.index}.language`}>
				{(field, props) => {
					const defaultFilter = (
						option: lang.Language | undefined,
						inputValue: string
					) => {
						if (!option) return true

						return (
							option.toLowerCase().includes(inputValue.toLowerCase()) ||
							stringSimilarity(option, inputValue) > 0.5
						)
					}

					return (
						<Combobox
							required
							defaultFilter={defaultFilter}
							options={localizedLanguageArray}
							name={props.name}
							value={field.value}
							onChange={(v) => setValue(formStore, props.name, v!)}
							validationState={field.error.length > 0 ? "invalid" : "valid"}
							itemComponent={(props) => (
								<Combobox.Item
									item={props.item}
									class="inline-flex place-content-between rounded px-1 py-0.5 data-[highlighted]:bg-gray-100">
									<Combobox.ItemLabel class="px-1 text-gray-900 data-[selected]:font-medium data-[selected]:text-red-800">
										{props.item.rawValue}
									</Combobox.ItemLabel>
								</Combobox.Item>
							)}>
							<Combobox.Control
								aria-label="Language"
								class="inline-flex place-content-between leading-4">
								<Combobox.Input
									class="w-32 rounded-r-none border-r-0 outline-none"
									placeholder="Language"
									as={TextInput}
								/>
								<Combobox.Trigger class="bg-secondary place-content-center items-center rounded-r-md border border-gray-500 px-1 outline-none">
									<Combobox.Icon>
										<CaretSortIcon
											height={20}
											width={20}
										/>
									</Combobox.Icon>
								</Combobox.Trigger>
							</Combobox.Control>
							<Combobox.Portal>
								<Combobox.Content as={Card}>
									<Combobox.Listbox class="flex flex-col" />
								</Combobox.Content>
							</Combobox.Portal>
							<Combobox.ErrorMessage>
								<span class="text-sm text-red-700">{field.error}</span>
							</Combobox.ErrorMessage>
						</Combobox>
					)
				}}
			</Field>
		</li>
	)
}

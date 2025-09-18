import { Field, FieldArray, insert, remove, setInput } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { Language } from "@thc/api"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"

import type { ReleaseFormStore } from "./types"

export function LocalizedTitlesField(props: {
	of: ReleaseFormStore
	class?: string
}) {
	return (
		<div class={twMerge("flex min-h-32 w-full flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Localized Titles</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={() =>
						insert(props.of, {
							path: ["data", "localized_titles"],
							initialInput: {
								language_id: undefined,
								title: "",
							},
						})
					}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<ul class="flex h-full flex-col gap-2">
				<FieldArray
					of={props.of}
					path={["data", "localized_titles"]}
				>
					{(fa) => (
						<For
							each={fa.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<LocalizedTitleItem
									index={idx()}
									of={props.of}
								/>
							)}
						</For>
					)}
				</FieldArray>
			</ul>
		</div>
	)
}

function LocalizedTitleItem(props: { index: number; of: ReleaseFormStore }) {
	let onLangChange = (v: Language | null) => {
		setInput(props.of, {
			path: ["data", "localized_titles", props.index, "language_id"],
			input: v?.id as unknown as number,
		})
	}

	return (
		<li class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
			<Field
				of={props.of}
				path={["data", "localized_titles", props.index, "title"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							placeholder="Title"
							value={field.input as string | undefined}
						/>
						<InputField.Error>
							{field.errors ? field.errors[0] : undefined}
						</InputField.Error>
					</InputField.Root>
				)}
			</Field>
			{/* TODO: form init value */}
			<LanguageCombobox onChange={onLangChange} />
			<Button
				variant="Tertiary"
				size="Sm"
				onClick={() =>
					remove(props.of, {
						path: ["data", "localized_titles"],
						at: props.index,
					})
				}
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

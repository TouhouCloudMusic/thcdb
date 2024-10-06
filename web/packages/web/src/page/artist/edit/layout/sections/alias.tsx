import { getValue, insert, reset } from "@modular-forms/solid"
import { For, Match, Show, Switch } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { PrimaryButton, TertiaryButton } from "~/component/button/index.tsx"
import { Label } from "~/component/form/index.tsx"
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx.ts"

import { repeat } from "ramda"
import { SearchAndAddDialog } from "~/component/dialog/SearchAndAddDialog.tsx"
import {
	FieldArray as _FieldArray,
	ErrorMessage,
	ResetFieldDialogTrigger,
} from "~/component/form/index.tsx"
import { type AliasSchema } from "../../data/form/index.ts"
import { useController } from "../context.tsx"
import * as Style from "../style.ts"

const fakeData = repeat(
	{
		name: "Foo",
		is_str: false,
	},
	9
)

export function Aliases() {
	const { artistType, FieldArray, dataQuery, formStore } = useController()

	return (
		<FieldArray name="alias">
			{(fieldArray) => {
				const insertAlias = (alias?: AliasSchema) =>
					insert(formStore, fieldArray.name, {
						// @ts-ignore
						value: {
							name: alias?.name ?? "",
							is_str: alias?.is_str ?? false,
							id: alias?.id,
						},
					})

				const resetField = () => reset(formStore, fieldArray.name)
				return (
					<div>
						<div class="mr-0.5 flex items-end justify-between [&_svg]:size-[15px]">
							<h4 class={Label.className}>
								<Switch>
									<Match when={dataQuery?.isLoading}>
										<span class="text-sm leading-6">Loading...</span>
									</Match>
									<Match when={!dataQuery && artistType.isNone}>
										<span class="text-sm leading-6">
											Please Select Artist Type
										</span>
									</Match>
									<Match when={!artistType.isNone}>Aliases</Match>
								</Switch>
							</h4>
							<div>
								<ResetFieldDialogTrigger
									fieldName={fieldArray.name}
									onReset={resetField}
								/>
								<SearchAndAddDialog
									data={fakeData}
									ListItem={(props) => (
										<>
											<div>
												<p>{props.data.name}</p>
												<span class="text-tertiary">lorem ipsum</span>
											</div>
											<TertiaryButton
												class="aspect-square min-h-6"
												onClick={() => insertAlias(props.data)}>
												<PlusIcon class="m-auto" />
											</TertiaryButton>
										</>
									)}
								/>
							</div>
						</div>

						<ul class={_FieldArray.container.className}>
							<For
								each={fieldArray.items}
								fallback={
									<span class="m-auto text-slate-600">Click "+" to add</span>
								}>
								{(_, index) => <Alias index={index()} />}
							</For>
						</ul>
						<ErrorMessage>{fieldArray.error}</ErrorMessage>
					</div>
				)
			}}
		</FieldArray>
	)
}

function Alias(props: IndexComponentProps) {
	const { Field, formStore, alias } = useController()
	return (
		<li class="flex w-full gap-2 rounded-md bg-white p-1.5">
			<Field
				name={`alias.${props.index}.name`}
				type="string">
				{(field, fieldProps) => (
					<Show
						when={getValue(formStore, `alias.${props.index}.is_str`, {
							shouldActive: false,
						})}
						fallback={<div class="flex flex-1">{field.value}</div>}>
						<input
							{...fieldProps}
							class={twMerge(Style.input, "flex-auto")}
							type="text"
							placeholder=""
							value={field.value}
						/>
					</Show>
				)}
			</Field>
			<PrimaryButton
				class={"aspect-square p-1 text-sm"}
				color="warning"
				onClick={() => alias.remove(props.index)}>
				<Cross1Icon class="" />
			</PrimaryButton>
		</li>
	)
}

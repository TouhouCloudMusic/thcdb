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
								<TertiaryButton
									size="xs"
									onClick={insertAlias}
									class="mr-0.5 aspect-square h-full p-1.5"
									aria-label={`Insert new item to ${fieldArray.name.replace("_", " ")}`}>
									<PlusIcon />
								</TertiaryButton>
							</div>
						</div>

						<ul class={_FieldArray.container.className}>
							<For
								each={fieldArray.items}
								fallback={
									<span class="m-auto text-slate-600">
										Click "+" to add Input
									</span>
								}>
								{(_, index) => (
									<li>
										<Alias index={index()} />
									</li>
								)}
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
		<div class="flex w-full gap-2 rounded-md border bg-white p-1.5">
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
			<DeleteButton
				class={"flex h-6 min-h-6 w-6 min-w-6 flex-initial self-center text-sm"}
				onClick={() => alias.remove(props.index)}
			/>
		</div>
	)
}

function SearchTab() {
	const { artistType, alias, t } = useController()

	return (
		<div class="flex flex-col">
			<h4 class={Style.label}>{t.add_alias()}</h4>
			<input
				type="text"
				class={Style.input}
				disabled={artistType.isNone}
				placeholder={t.search_artist()}
				onInput={R.debounce({ delay: 300 }, (e) =>
					alias.serach(e.target.value)
				)}
			/>
			<div class={Style.searchResult.container}>
				<Show when={alias.searchResult}>
					<ul class={Style.searchResult.list}>
						<Index each={alias.searchResult}>
							{(result) => <SearchResult result={result()} />}
						</Index>
					</ul>
				</Show>
			</div>
		</div>
	)
}

function SearchResult(props: { result: ArtistByKeyword }) {
	const { alias } = useController()
	return (
		<li>
			<button
				type="button"
				class={Style.searchResult.item}
				onClick={() => {
					alias.add(props.result)
				}}>
				{props.result.name}
			</button>
		</li>
	)
}

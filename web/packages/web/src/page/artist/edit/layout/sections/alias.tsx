import { getValue } from "@modular-forms/solid"
import * as R from "radash"
import { For, Index, Match, Show, Switch } from "solid-js"
import { FormUI } from "~/component/form/ui/index.tsx"
import { useController } from "../../context.tsx"
import { AddStringInputButton } from "./components/add_str_input_button.tsx"
import { DeleteButton } from "./components/delete_button.tsx"

import { type IndexComponentProps } from "~/lib/type/solid-js/jsx.ts"

import { twMerge } from "tailwind-merge"
import { type ArtistByKeyword } from "../../data"
import * as Style from "../style.ts"

export function Aliases() {
	const { artistType, alias, t, FieldArray, dataQuery } = useController()
	return (
		<div class={Style.alias.layout}>
			<div class={Style.alias.list.container}>
				<div class={Style.alias.list.title}>
					<h4 class={Style.label}>
						<Switch>
							<Match when={dataQuery?.isLoading}>
								<span class="text-sm">Loading...</span>
							</Match>
							<Match when={!dataQuery && artistType.isNone}>
								<span class="text-sm">Please Select Artist Type</span>
							</Match>
							<Match when={!artistType.isNone}>Aliases</Match>
						</Switch>
					</h4>
					<Show when={!artistType.isNone}>
						<AddStringInputButton
							onClick={() => {
								alias.addStrInput()
							}}
							label={t.add_string_input()}
						/>
					</Show>
				</div>
				<ul class="flex flex-col gap-1">
					<FieldArray name="alias">
						{(fieldArray) => (
							<>
								<For each={fieldArray.items}>
									{(_, index) => (
										<li>
											<Alias index={index} />
										</li>
									)}
								</For>
								{fieldArray.error && (
									<FormUI.ErrorText text={fieldArray.error} />
								)}
							</>
						)}
					</FieldArray>
				</ul>
			</div>
			<SearchTab />
		</div>
	)
}

function Alias(props: IndexComponentProps) {
	const { Field, formStore, alias } = useController()
	return (
		<div class="flex w-full gap-2 rounded-md border bg-white p-1.5">
			<Field
				name={`alias.${props.index()}.name`}
				type="string">
				{(field, fieldProps) => (
					<Show
						when={!getValue(formStore, `alias.${props.index()}.id`)}
						fallback={<div>{field.value}</div>}>
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
				buttonProps={{
					type: "button",
					class:
						"flex min-h-6 min-w-6 h-6 w-6 flex-initial text-sm self-center",
					onClick: () => alias.remove(props.index()),
				}}
				iconProps={{
					class: "bold size-4 place-self-center stroke-white",
				}}
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
			<div class="relative">
				<ul class="absolute w-full gap-2">
					<Index each={alias.searchResult}>
						{(result) => <SearchResult result={result()} />}
					</Index>
				</ul>
			</div>
		</div>
	)
}

function SearchResult(props: { result: ArtistByKeyword }) {
	const { alias } = useController()
	return (
		<button
			type="button"
			class={Style.search_result}
			onClick={() => {
				alias.add(props.result)
			}}>
			{props.result.name}
		</button>
	)
}

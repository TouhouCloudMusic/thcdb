import { Field, FieldArray, getValue } from "@modular-forms/solid"
import { For, Show } from "solid-js"
import { FormUI } from "~/component/form/ui"
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx"
import { useController } from "../../context"
import { scope_title_tw } from "../style"
import { AddStringInputButton } from "./components/add_str_input_button"
import { SearchAristCard } from "./components/search_artist_card"

export function Aliases() {
	const { formStore, artistType, alias, t } = useController()
	return (
		<div
			id="container"
			class="flex min-h-32 place-content-between gap-2">
			<div
				id="left_container"
				class="flex w-full min-w-[20rem] flex-col">
				<div
					id="label"
					class="flex h-fit w-full place-content-between">
					<h4 class={scope_title_tw}>Aliases</h4>
					<Show when={!artistType.isNone}>
						<AddStringInputButton
							onClick={() => alias.addStrInput()}
							label={t.add_str_input_label()}
						/>
					</Show>
				</div>
				<ul
					id="list"
					class="flex flex-col gap-2">
					<FieldArray
						of={formStore()}
						name="alias">
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
			<SearchAristCard
				label={t.search_artist_card.label({
					item: "alias",
				})}
				placeholder={t.search_artist_card.placeholder()}
				disableSearch={artistType.isNone}
				onInput={(e) => alias.serach(e.currentTarget.value)}
				searchResult={alias.searchResult}
				handleAdd={alias.add.bind(alias)}
			/>
		</div>
	)
}

function Alias(props: IndexComponentProps) {
	const { formStore, artistType, t } = useController()
	return (
		<Field
			of={formStore()}
			name={`alias.${props.index()}.name`}
			type="string">
			{(nameField, nameProps) => (
				<Show
					when={!getValue(formStore(), `alias.${props.index()}.id`)}
					fallback={<div>{nameField.value}</div>}>
					<input
						{...nameProps}
						class="w-full"
						type=" text"
						value={nameField.value}
					/>
				</Show>
			)}
		</Field>
	)
}

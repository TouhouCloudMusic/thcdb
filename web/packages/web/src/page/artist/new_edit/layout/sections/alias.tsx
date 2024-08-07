import { Field, FieldArray, getValue } from "@modular-forms/solid"
import { For, Index, Match, Show, Switch } from "solid-js"
import { FormUI } from "~/component/form/ui"
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx.ts"
import { AddStringInputButton } from "~/page/artist/new_edit/layout/sections/components/add_str_input_button.tsx"
import { useController } from "../../context.tsx"
import * as Style from "../style.ts"

export function Aliases() {
	const { formStore, artistType, alias, t } = useController()
	return (
		<div class={Style.alias.layout}>
			<div class={Style.alias.list.container}>
				<div class={Style.alias.list.title}>
					<h4 class={Style.label}>
						<Switch>
							<Match when={artistType.isPerson}>Aliases</Match>
							<Match when={artistType.isGroup}>Aliases</Match>
							<Match when={artistType.isNone}>
								<span class="text-sm">{t.member.label.none()}</span>
							</Match>
						</Switch>
					</h4>
					<Show when={!artistType.isNone}>
						<AddStringInputButton
							onClick={() => alias.addStrInput()}
							label={t.add_str_input_label()}
						/>
					</Show>
				</div>
				<ul>
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
			<div>
				<h4 class={Style.label}>
					{t.search_artist_card.label({
						type: "alias",
					})}
				</h4>
				<div>
					<input
						type="text"
						class="px-1"
						disabled={artistType.isNone}
						placeholder={t.search_artist_card.placeholder()}
						onInput={(e) => alias.serach(e.currentTarget.value)}
					/>
					<div class="relative">
						<div class="absolute w-full">
							<Index each={alias.searchResult}>
								{(result) => (
									<button
										type="button"
										class="border-sm my-2 w-full border-gray-300 bg-white px-2"
										onClick={() => alias.add(result())}>
										{result().name}
									</button>
								)}
							</Index>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
function Alias(props: IndexComponentProps) {
	const { formStore } = useController()
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

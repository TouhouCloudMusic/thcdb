import {
	Field,
	FieldArray,
	getError,
	getValue,
	setValue,
} from "@modular-forms/solid"
import { For, Index, Match, Show, Switch, createMemo } from "solid-js"
import { Cross1Icon } from "solid-radix-icons"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx.ts"
import { notNullString } from "~/lib/validate/not_empty_string.ts"
import { AddStringInputButton } from "~/page/artist/new_edit/layout/sections/components/add_str_input_button.tsx"
import { useController } from "../../context.tsx"
import * as Style from "../style.ts"

export function MemberList() {
	const { formStore, artistType, member, t } = useController()
	return (
		<div class={Style.member.layout}>
			<div class={Style.member.list.container}>
				<div class={Style.member.list.title}>
					<h4 class={Style.label}>
						<Switch>
							<Match when={artistType.isPerson}>
								<p>{t.member.label.person()}</p>
							</Match>
							<Match when={artistType.isGroup}>
								<p>{t.member.label.group()}</p>
							</Match>
							<Match when={artistType.isNone}>
								<span class="text-sm">{t.member.label.none()}</span>
							</Match>
						</Switch>
					</h4>
					<Show when={!artistType.isNone}>
						<AddStringInputButton
							onClick={() => member.addStringInput()}
							label={t.add_str_input_label()}
						/>
					</Show>
				</div>
				<ul>
					<FieldArray
						of={formStore()}
						name="member">
						{(fieldArray) => (
							<>
								<For each={fieldArray.items}>
									{(_, index) => (
										<li>
											<MemberField index={index} />
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
						type: "member",
					})}
				</h4>
				<div>
					<input
						type="text"
						class="px-1"
						disabled={artistType.isNone}
						placeholder={t.search_artist_card.placeholder()}
						onInput={(e) => member.serach(e.currentTarget.value)}
					/>
					<div class="relative">
						<div class="absolute w-full">
							<Index each={member.searchResult}>
								{(result) => (
									<button
										type="button"
										class="border-sm my-2 w-full border-gray-300 bg-white px-2"
										onClick={() => member.add(result())}>
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

function Errors(props: { index: () => number }) {
	const { formStore } = useController()
	const nameFieldErr = createMemo(() =>
		getError(formStore(), `member.${props.index()}.name`)
	)
	const isTextFieldErr = createMemo(() =>
		getError(formStore(), `member.${props.index()}.is_str`)
	)
	const joinYearFieldErr = createMemo(() =>
		getError(formStore(), `member.${props.index()}.join_year`)
	)
	const leaveYearFieldErr = createMemo(() =>
		getError(formStore(), `member.${props.index()}.leave_year`)
	)
	return (
		<>
			<FormUI.ErrorText
				showWhen={notNullString(nameFieldErr())}
				text={`Error in name field:\n${nameFieldErr()}`}
			/>
			<FormUI.ErrorText
				showWhen={notNullString(isTextFieldErr())}
				text={`Error in isText field:\n${isTextFieldErr()}`}
			/>
			<FormUI.ErrorText
				showWhen={notNullString(joinYearFieldErr())}
				text={`Error in join year field:\n${joinYearFieldErr()}`}
			/>
			<FormUI.ErrorText
				showWhen={notNullString(leaveYearFieldErr())}
				text={`Error in leave year field:\n${leaveYearFieldErr()}`}
			/>
		</>
	)
}

function MemberField(props: { index: () => number }) {
	const { member } = useController()

	return (
		<li>
			<div class="flex w-full flex-row place-content-between gap-2 rounded-md border-[0.1rem] bg-white p-2">
				<div class="grid w-full grid-cols-1 gap-1">
					<MemberName index={props.index} />
					<div class="flex w-full gap-1">
						<MemberYears index={props.index} />
					</div>
					<Errors index={props.index} />
				</div>
				<Button.Warning
					type="button"
					class="flex min-h-6 min-w-6 flex-initial place-content-center text-sm"
					onClick={() => member.remove(props.index())}>
					<Cross1Icon class="bold size-4 place-self-center stroke-white" />
				</Button.Warning>
			</div>
			<MemberID index={props.index} />
		</li>
	)
}

function MemberName(props: IndexComponentProps) {
	const { formStore } = useController()
	// not reactive, maybe……
	const isStr = getValue(formStore(), `member.${props.index()}.is_str`, {
		shouldActive: false,
	})
	return (
		<Field
			of={formStore()}
			name={`member.${props.index()}.name`}>
			{(nameField, nameProps) => (
				<Show
					when={isStr}
					fallback={<p>{nameField.value}</p>}>
					<input
						{...nameProps}
						type="text"
						class={`min-w-0 flex-1 rounded border-[0.1rem] border-gray-300 px-1`}
						value={nameField.value ?? ""}
						placeholder="Enter artist name"
					/>
				</Show>
			)}
		</Field>
	)
}

function MemberYears(props: IndexComponentProps) {
	const { formStore } = useController()

	const thisYear = new Date().getFullYear()
	function yearFieldOnInput(
		e: InputEvent & {
			currentTarget: HTMLInputElement
			target: HTMLInputElement
		},
		fieldName: `member.${number}.join_year` | `member.${number}.leave_year`
	) {
		const target = e.target
		if (Number(target.value) >= thisYear) {
			target.value = String(thisYear)
		}
		setValue(formStore(), fieldName, Number(target.value))
	}
	return (
		<>
			<Field
				of={formStore()}
				name={`member.${props.index()}.join_year`}
				type="number">
				{(joinYearField, joinYearProps) => (
					<input
						{...joinYearProps}
						type="number"
						min="-1"
						max={thisYear}
						value={joinYearField.value ?? undefined}
						onInput={(e) =>
							yearFieldOnInput(e, `member.${props.index()}.join_year`)
						}
						class="no_spinner w-1/2 rounded border-[0.1rem] border-gray-300 px-1"
						placeholder="Join year"
					/>
				)}
			</Field>
			<Field
				of={formStore()}
				name={`member.${props.index()}.leave_year`}
				type="number">
				{(leaveYearField, leaveYearProps) => (
					<input
						{...leaveYearProps}
						type="number"
						min="-1"
						max={thisYear}
						onInput={(e) =>
							yearFieldOnInput(e, `member.${props.index()}.leave_year`)
						}
						value={leaveYearField.value ?? undefined}
						class="no_spinner w-1/2 rounded border-[0.1rem] px-1"
						placeholder="Leave year"
					/>
				)}
			</Field>
		</>
	)
}

function MemberID(props: IndexComponentProps) {
	const { formStore } = useController()
	return (
		<Field
			of={formStore()}
			name={`member.${props.index()}.id`}>
			{(field, props) => (
				<>
					<input
						{...props}
						type="text"
						value={field.value}
						class="invisible"
						hidden
					/>
				</>
			)}
		</Field>
	)
}

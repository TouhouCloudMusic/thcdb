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
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx"
import { notNullString } from "~/lib/validate/not_empty_string"
import { useController } from "../../context"
import { h4Class } from "../style"

export function MemberList() {
	const { formStore, artistType: type, member, t } = useController()
	function AddStringInputButton() {
		return (
			<Button.Borderless
				type="button"
				onClick={() => member.addStringInput()}
				class="mx-1 px-1 text-sm text-gray-700">
				{t("member.add_str_input")}
			</Button.Borderless>
		)
	}
	return (
		<div class="flex min-h-64 gap-2">
			<div class="flex w-64 flex-col">
				<h4 class={h4Class}>
					<Switch>
						<Match when={type.value === "Person"}>
							<div class="flex flex-row place-content-between">
								<p>{t("member.label.person")}</p>
								<AddStringInputButton />
							</div>
						</Match>
						<Match when={type.value === "Group"}>
							<div class="flex flex-row place-content-between">
								<p>{t("member.label.group")}</p>
								<AddStringInputButton />
							</div>
						</Match>
						<Match when={type.value === undefined}>
							<span class="text-sm">{t("member.label.none")}</span>
						</Match>
					</Switch>
				</h4>
				<FieldArray
					of={formStore()}
					name="member">
					{(fieldArray) => (
						<ul class="flex flex-col gap-2">
							<For each={fieldArray.items}>
								{(_, index) => <MemberField index={index} />}
							</For>
							{fieldArray.error && <FormUI.ErrorText text={fieldArray.error} />}
						</ul>
					)}
				</FieldArray>
			</div>

			<div class="flex flex-col">
				<h4 class={h4Class}>{t("member.search.label")}</h4>
				<input
					type="text"
					class="px-1"
					disabled={type.value === undefined}
					placeholder={t("member.search.placeholder")}
					onInput={(e) => member.serach(e.currentTarget.value)}
				/>
				<div class="relative">
					<div class="absolute w-full">
						<Index each={member.searchResult}>
							{(artist) => (
								<button
									type="button"
									class="border-sm my-2 w-full border-gray-300 bg-white px-2"
									onClick={() => member.add(artist())}>
									{artist().name}
								</button>
							)}
						</Index>
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

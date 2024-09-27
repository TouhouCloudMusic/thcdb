import { getError, getValue, toCustom } from "@modular-forms/solid"
import { For, Index, Match, Show, Switch, createMemo } from "solid-js"
import { PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { TertiaryButton } from "~/component/button/index.tsx"
import { FormUI } from "~/component/form/ui"
import { type IndexComponentProps } from "~/lib/type/solid-js/jsx.ts"
import { notNullString } from "~/lib/validate/not_empty_string.ts"

import { type OptionalYearSchema } from "../../data/form/index.ts"
import { useController } from "../context.tsx"
import * as Style from "../style.ts"
import { DeleteButton } from "./components/delete_button.tsx"

export function MemberList() {
	const { artistType, t, FieldArray, dataQuery } = useController()
	return (
		<div class={Style.member.layout}>
			<div class={Style.member.list.container}>
				<div class={Style.member.list.title}>
					<h4 class={Style.label}>
						<Switch>
							<Match when={artistType.isPerson}>
								<p>{t.member_of()}</p>
							</Match>
							<Match when={artistType.isGroup}>
								<p>{t.members()}</p>
							</Match>
							<Match when={dataQuery && artistType.isNone}>
								<span class="text-sm">Loading...</span>
							</Match>
							<Match when={!dataQuery && artistType.isNone}>
								<span class="text-sm">{t.type()}</span>
							</Match>
						</Switch>
					</h4>
					<Show when={!artistType.isNone}>
						<TertiaryButton
							onClick={() => {
								"TODO"
							}}
							size="xs"
							class="mr-0.5 aspect-square h-full p-1.5">
							<PlusIcon />
						</TertiaryButton>
					</Show>
				</div>
				<ul>
					<FieldArray name="member">
						{(fieldArray) => (
							<>
								<For each={fieldArray.items}>
									{(_, index) => (
										<li>
											<MemberField index={index()} />
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

function SearchTab() {
	const { artistType, member, t } = useController()

	return (
		<div class="flex flex-col">
			<h4 class={Style.label}>
				{artistType.isPerson ? t.add_member_of() : t.add_member()}
			</h4>
			<input
				type="text"
				class={Style.input}
				disabled={artistType.isNone}
				placeholder={t.search_artist()}
				onInput={(e) => member.serach(e.currentTarget.value)}
			/>
			<div class={Style.searchResult.container}>
				<Show when={member.searchResult}>
					<ul class={Style.searchResult.list}>
						<Index each={member.searchResult}>
							{(result) => (
								<li>
									<button
										type="button"
										class={Style.searchResult.item}
										onClick={() => member.add(result())}>
										{result().name}
									</button>
								</li>
							)}
						</Index>
					</ul>
				</Show>
			</div>
		</div>
	)
}

function MemberField(props: IndexComponentProps) {
	const { member, FieldArray } = useController()

	return (
		<li>
			<div class="flex w-full flex-row place-content-between gap-2 rounded-md border-[0.1rem] bg-white p-2">
				<div class="grid w-full grid-cols-1 gap-1">
					<MemberName index={props.index} />
					<div class="flex w-full gap-1">
						<FieldArray name={`member.${props.index}.active_year`}>
							{(fieldArray) => (
								<ActiveYearArray
									fieldArrayName={fieldArray.name}
									index={props.index}
								/>
							)}
						</FieldArray>
					</div>
					<Errors index={props.index} />
				</div>
				<DeleteButton
					type="button"
					class={[
						"flex min-h-6 min-w-6 flex-initial place-content-center text-sm",
						"[&_svg]:size-4 [&_svg]:place-self-center [&_svg]:stroke-white [&_svg]:font-bold",
					].join(" ")}
					onClick={() => member.remove(props.index)}
				/>
			</div>
			<MemberID index={props.index} />
		</li>
	)
}

function MemberName(props: IndexComponentProps) {
	const { formStore, Field } = useController()

	const is_str = () =>
		getValue(formStore, `member.${props.index}.is_str`, {
			shouldActive: false,
		})
	return (
		<Field name={`member.${props.index}.name`}>
			{(nameField, nameProps) => (
				<Show
					when={is_str()}
					fallback={<p>{nameField.value}</p>}>
					<input
						{...nameProps}
						type="text"
						class={Style.input}
						value={nameField.value ?? ""}
						placeholder="Enter artist name"
					/>
				</Show>
			)}
		</Field>
	)
}

function ActiveYearArray(
	props: IndexComponentProps & {
		fieldArrayName: `member.${number}.active_year`
	}
) {
	const { Field } = useController()

	const thisYear = new Date().getFullYear()

	const transformYear = toCustom<OptionalYearSchema>(
		(v, e) => {
			if (Number(e.currentTarget.value) > thisYear) {
				e.currentTarget.value = String(thisYear)
				v = thisYear
			}
			return v
		},
		{ on: "input" }
	)

	return (
		<>
			<Field
				name={`${props.fieldArrayName}.${props.index}.lower`}
				type="number"
				transform={transformYear}>
				{(joinYearField, joinYearProps) => (
					<input
						{...joinYearProps}
						type="number"
						min="-1"
						max={thisYear}
						value={joinYearField.value ?? undefined}
						class={twMerge(Style.input, "no_spinner flex-1")}
						placeholder="Join year"
					/>
				)}
			</Field>
			<Field
				name={`${props.fieldArrayName}.${props.index}.upper`}
				type="number"
				transform={transformYear}>
				{(leaveYearField, leaveYearProps) => (
					<input
						{...leaveYearProps}
						type="number"
						min="-1"
						max={thisYear}
						value={leaveYearField.value ?? undefined}
						class={twMerge(Style.input, "no_spinner flex-1")}
						placeholder="Leave year"
					/>
				)}
			</Field>
		</>
	)
}

function MemberID(props: IndexComponentProps) {
	const { Field } = useController()
	return (
		<Field name={`member.${props.index}.id`}>
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

function Errors(props: IndexComponentProps) {
	const { formStore } = useController()
	const nameFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index}.name`)
	)
	const isTextFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index}.is_str`)
	)
	// const joinYearFieldErr = createMemo(() =>
	// 	getError(formStore, `member.${props.index}.join_year`)
	// )
	// const leaveYearFieldErr = createMemo(() =>
	// 	getError(formStore, `member.${props.index}.leave_year`)
	// )
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
			{/* <FormUI.ErrorText
				showWhen={notNullString(joinYearFieldErr())}
				text={`Error in join year field:\n${joinYearFieldErr()}`}
			/>
			<FormUI.ErrorText
				showWhen={notNullString(leaveYearFieldErr())}
				text={`Error in leave year field:\n${leaveYearFieldErr()}`}
			/> */}
		</>
	)
}

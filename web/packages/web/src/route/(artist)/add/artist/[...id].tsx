import { Field, FieldArray, Form, getError } from "@modular-forms/solid"
import { createAsync, useAction, useParams } from "@solidjs/router"
import {
	Accessor,
	For,
	Index,
	Match,
	Show,
	Suspense,
	Switch,
	createContext,
	createMemo,
} from "solid-js"
import { Cross1Icon } from "solid-radix-icons"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { useContextUnsave } from "~/lib/context/use_context_unsave"
import { notNullString } from "~/lib/validate/not_empty_string"
import { createController } from "./controller"
import { initData } from "./init_data"
import { h4Class } from "./style"
import { submitAction } from "./submit_action"

const Context = createContext<ReturnType<typeof createController>>()
const useController = useContextUnsave(Context)

export default function EditArtistPage() {
	const data = createAsync(() => initData(useParams()))
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<Context.Provider value={createController(data())}>
				<Main />
			</Context.Provider>
		</Suspense>
	)
}

function Main() {
	const { artistData, formStore, type, form } = useController()
	const action = useAction(submitAction)
	return (
		<Form
			of={formStore}
			onSubmit={(v) => {
				if (!form.changed) {
					form.setErrMsg("No changes")
					return
				}
				return action(v, artistData())
			}}
			method="post"
			class="flex flex-col gap-2">
			<Field
				of={formStore}
				name="id">
				{(field, props) => (
					<>
						<input
							{...props}
							type="text"
							value={artistData()?.id.toString() ?? ""}
							hidden
						/>
						{field.error && <p>{field.error}</p>}
					</>
				)}
			</Field>
			<Name />
			<Type />
			<Member />
			<div class="flex w-full flex-row place-content-around">
				<Button.Highlight
					type="submit"
					class="w-1/4 self-start py-1">
					Submit
				</Button.Highlight>
				<Show when={import.meta.env.DEV}>
					<Button.Borderless
						type="button"
						class="w-1/4 self-start py-1"
						onClick={() => {
							console.log("123")

							// console.log("form store: ", getValues(formStore))
							// console.log("form changed: ", form.changed)
							console.log(type.value)
						}}>
						Log
					</Button.Borderless>
				</Show>
			</div>
			<FormUI.ErrorText text={form.errMsg} />
			<FormUI.ErrorText text={formStore.response.message} />
		</Form>
	)
}

function Name() {
	const { artistData, formStore } = useController()
	return (
		<Field
			of={formStore}
			name="name">
			{(field, props) => (
				<div class="flex flex-col">
					<label
						for="name"
						class={h4Class}>
						Name
					</label>
					<input
						{...props}
						type="text"
						class={`h-7 w-2/3 rounded border border-gray-400 px-2 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-600`}
						classList={{
							"invalid:focus:ring-red-800 invalid:focus:border-red-800":
								field.error.length > 0,
						}}
						value={artistData() !== undefined ? artistData()?.name : undefined}
						required
					/>
					{field.error && <FormUI.ErrorText text={field.error} />}
				</div>
			)}
		</Field>
	)
}

function Type() {
	const { artistData, formStore, type } = useController()
	return (
		<div class="flex flex-col">
			<h4 class={h4Class}>Artist Type</h4>
			<Field
				of={formStore}
				name="artist_type">
				{(field, props) => (
					<>
						<div class="flex">
							<input
								{...props}
								type="radio"
								id="artist_type_person"
								value="Person"
								checked={artistData()?.artist_type === "Person"}
								onChange={() => type.toPerson()}
							/>
							<label for="artist_type_person">Person</label>
						</div>
						<div class="flex">
							<input
								{...props}
								type="radio"
								id="artist_type_group"
								value="Group"
								checked={artistData()?.artist_type === "Group"}
								onChange={() => type.toGroup()}>
								Group
							</input>
							<label for="artist_type_group">Group</label>
						</div>
						{field.error && <FormUI.ErrorText text={field.error} />}
					</>
				)}
			</Field>
		</div>
	)
}

function Member() {
	const { formStore, type, member } = useController()
	function AddStringInputButton() {
		return (
			<Button.Borderless
				type="button"
				onClick={() => member.addStringInput()}
				class="mx-1 px-1 text-sm text-gray-700">
				add string input
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
								<p>Member of</p>
								<AddStringInputButton />
							</div>
						</Match>
						<Match when={type.value === "Group"}>
							<div class="flex flex-row place-content-between">
								<p>Members</p>
								<AddStringInputButton />
							</div>
						</Match>
						<Match when={type.value === undefined}>
							<span class="text-sm">Please Select Artist Type</span>
						</Match>
					</Switch>
				</h4>
				<FieldArray
					of={formStore}
					name="member">
					{(fieldArray) => (
						<ul class="flex flex-col gap-2">
							<For each={fieldArray.items}>
								{(_, index) => <FieldArrayItem index={index} />}
							</For>
							{fieldArray.error && <FormUI.ErrorText text={fieldArray.error} />}
						</ul>
					)}
				</FieldArray>
			</div>

			<div class="flex flex-col">
				<h4 class={h4Class}>Add Artist</h4>
				<input
					type="text"
					placeholder="Search artist"
					class="px-1"
					onInput={(e) => member.serach(e.currentTarget.value)}
					disabled={type.value === undefined}
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

function FieldArrayItem(props: { index: () => number }) {
	const { formStore, member } = useController()

	return (
		<li>
			<Field
				of={formStore}
				name={`member.${props.index()}.name`}>
				{(nameField, nameProps) => (
					<Field
						of={formStore}
						name={`member.${props.index()}.is_str`}
						type="boolean">
						{(isTextField, isTextProps) => (
							<div class="flex w-full flex-row place-content-between gap-2 rounded-md border-[0.1rem] bg-white p-2">
								<div class="grid w-full grid-cols-1 gap-1">
									<input
										{...isTextProps}
										type="checkbox"
										checked={isTextField.value}
										hidden
									/>
									<Show
										when={isTextField.value === true}
										fallback={<p>{nameField.value}</p>}>
										<input
											{...nameProps}
											type="text"
											class={`min-w-0 flex-1 rounded border-[0.1rem] border-gray-300 px-1`}
											value={nameField.value}
											placeholder="Enter artist name"
										/>
									</Show>
									<div class="flex w-full gap-1">
										<Field
											of={formStore}
											name={`member.${props.index()}.join_year`}
											type="number">
											{(joinYearField, joinYearProps) => (
												<input
													{...joinYearProps}
													type="number"
													min="-1"
													max={new Date().getFullYear()}
													value={joinYearField.value ?? undefined}
													class="no_spinner w-1/2 rounded border-[0.1rem] border-gray-300 px-1"
													placeholder="Join year"
												/>
											)}
										</Field>
										<Field
											of={formStore}
											name={`member.${props.index()}.leave_year`}
											type="number">
											{(leaveYearField, leaveYearProps) => (
												<input
													{...leaveYearProps}
													type="number"
													min="-1"
													max={new Date().getFullYear()}
													value={leaveYearField.value ?? undefined}
													class="no_spinner w-1/2 rounded border-[0.1rem] px-1"
													placeholder="Leave year"
												/>
											)}
										</Field>
									</div>
									<FormFieldError index={props.index} />
								</div>
								<Button.Warning
									type="button"
									class="flex min-h-6 min-w-6 flex-initial place-content-center text-sm"
									onClick={() => member.remove(props.index())}>
									<Cross1Icon class="bold size-4 place-self-center stroke-white" />
								</Button.Warning>
							</div>
						)}
					</Field>
				)}
			</Field>
			<InvisibleField index={props.index} />
		</li>
	)
}

function FormFieldError(props: { index: () => number }) {
	const { formStore } = useController()
	const nameFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.name`)
	)
	const isTextFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.is_str`)
	)
	const joinYearFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.join_year`)
	)
	const leaveYearFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.leave_year`)
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

function InvisibleField(props: { index: Accessor<number> }) {
	const { formStore } = useController()
	return (
		<div class="invisible">
			<Field
				of={formStore}
				name={`member.${props.index()}.id`}>
				{(field, props) => (
					<>
						<input
							{...props}
							type="text"
							value={field.value}
							hidden
						/>
					</>
				)}
			</Field>
			<Field
				of={formStore}
				name={`member.${props.index()}.artist_type`}>
				{(field, props) => (
					<>
						<input
							{...props}
							type="text"
							value={field.value}
							hidden
						/>
					</>
				)}
			</Field>
		</div>
	)
}

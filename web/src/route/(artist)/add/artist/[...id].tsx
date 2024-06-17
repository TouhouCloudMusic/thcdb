import {
	Field,
	FieldArray,
	Form,
	getError,
	getValues,
	setValues,
} from "@modular-forms/solid"
import {
	Params,
	cache,
	createAsync,
	redirect,
	useAction,
	useParams,
} from "@solidjs/router"
import { either } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import {
	For,
	Index,
	Match,
	Show,
	Suspense,
	Switch,
	createContext,
	createMemo,
	onMount,
} from "solid-js"
import { Cross1Icon } from "solid-radix-icons"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { findArtistByID } from "~/database/artist/find_artist_by_id"
import { useContextUnsave } from "~/lib/context/use_context_unsave"
import { NotFoundError } from "~/lib/error/errors"
import { isEmptyOrValidID } from "~/lib/validate/validate_params"
import { createController } from "./controller"
import { initFormStore_Member } from "./utils"
import { submitAction } from "./submit"
import { notNullString } from "~/lib/validate/not_empty_string"

const getArtistDataByID_EditPage = cache(async function (params: Params) {
	const res = await pipe(
		params,
		isEmptyOrValidID,
		either.match(
			() => {
				throw redirect("/404")
			},
			async (id) => {
				if (!id) return
				else
					return pipe(
						await findArtistByID(id),
						either.match(
							(e) => {
								if (e instanceof NotFoundError) return undefined
								// TODO: 研究如何把error发到客户端上
								else {
									console.log(e)
									throw redirect("/500")
								}
							},
							(d) => d
						)
					)
			}
		)
	)
	return res
}, `artist_by_id_edit`)

const h4Class = `text-[1.1rem] font-semibold`

const EditArtistPageContext =
	createContext<ReturnType<typeof createController>>()
const useEditArtistPageController = useContextUnsave(EditArtistPageContext)

export default function EditArtistPage() {
	const controller = createController()
	return (
		<Suspense fallback={<div>Loading...</div>}>
			<EditArtistPageContext.Provider value={controller}>
				<Main />
			</EditArtistPageContext.Provider>
		</Suspense>
	)
}

function Main() {
	const data = createAsync(() => getArtistDataByID_EditPage(useParams()))

	const { artistData, setArtistData, formStore, type, form } =
		useEditArtistPageController()
	const action = useAction(submitAction)
	onMount(() => {
		const initData = data()
		if (initData) {
			setArtistData(initData)
			type.setType(initData.type)
			const initFormValue = {
				id: initData?.id.toString(),
				name: initData?.name,
				type: initData?.type,
				member: initFormStore_Member(initData),
			}
			setValues(formStore, initFormValue)
			form.setOldValue(initFormValue)
		}
	})
	return (
		<Form
			of={formStore}
			onSubmit={(v) => {
				if (!form.changed) {
					return form.setErrMsg("No changes")
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
							console.log("form store: ", getValues(formStore))
							console.log("form changed: ", form.changed)
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
	const { artistData, formStore } = useEditArtistPageController()
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
	const { artistData, formStore, type } = useEditArtistPageController()
	return (
		<div class="flex flex-col">
			<h4 class={h4Class}>Artist Type</h4>
			<Field
				of={formStore}
				name="type">
				{(field, props) => (
					<>
						<div class="flex">
							<input
								{...props}
								type="radio"
								id="artist_type_person"
								value="Person"
								checked={artistData()?.type === "Person"}
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
								checked={artistData()?.type === "Group"}
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
	const { formStore, type, member } = useEditArtistPageController()
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
	const { formStore, member } = useEditArtistPageController()

	return (
		<li>
			<Field
				of={formStore}
				name={`member.${props.index()}.name`}>
				{(nameField, nameProps) => (
					<Field
						of={formStore}
						name={`member.${props.index()}.isText`}
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
											name={`member.${props.index()}.joinYear`}
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
											name={`member.${props.index()}.leaveYear`}
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
									<FieldArrayItemError index={props.index} />
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
			<div class="invisible">
				<Field
					of={formStore}
					name={`member.${props.index()}.artistID`}>
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
					name={`member.${props.index()}.groupMemberID`}>
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
					name={`member.${props.index()}.type`}>
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
		</li>
	)
}

function FieldArrayItemError(props: { index: () => number }) {
	const { formStore } = useEditArtistPageController()
	const nameFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.name`)
	)
	const isTextFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.isText`)
	)
	const joinYearFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.joinYear`)
	)
	const leaveYearFieldErr = createMemo(() =>
		getError(formStore, `member.${props.index()}.leaveYear`)
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

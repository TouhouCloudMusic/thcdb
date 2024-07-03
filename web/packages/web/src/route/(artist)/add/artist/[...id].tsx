import { Field, Form } from "@modular-forms/solid"
import { createAsync, useAction, useParams } from "@solidjs/router"
import { Show, Suspense } from "solid-js"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { Member } from "./(comp)/member"
import { Context, useController } from "./context"
import { createController } from "./controller"
import { initData } from "./init_data"
import { h4Class } from "./style"
import { submitAction } from "./submit_action"

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

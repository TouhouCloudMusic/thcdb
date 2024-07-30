import { Field, Form, getErrors, getValues } from "@modular-forms/solid"
import { useAction } from "@solidjs/router"
import { type Accessor, Show, Suspense } from "solid-js"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { Member } from "./components/member"
import { Context, useController } from "./context"
import { createController } from "./controller"
import { type ArtistByID_EditArtistPage } from "./data/get"
import { type FlatDict } from "./i18n"
import { h4Class } from "./style"
import { submitAction } from "./submit_action"

export function ArtistFormLayout(props: {
	data: Accessor<ArtistByID_EditArtistPage | null | undefined>
	dict: Accessor<FlatDict | undefined>
}) {
	return (
		<Suspense>
			<Context.Provider value={createController(props.data, props.dict)}>
				<Main />
			</Context.Provider>
		</Suspense>
	)
}

function Main() {
	const { artistData, formStore, form, t } = useController()
	const action = useAction(submitAction)
	return (
		<Form
			of={formStore}
			onSubmit={(v) => {
				if (!form.changed) {
					form.setErrMsg("No changes")
					return
				}
				return action(v, artistData)
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
							value={artistData?.id.toString() ?? ""}
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
					{t("submit")}
				</Button.Highlight>
				<Show when={import.meta.env.DEV}>
					<LogBtn />
				</Show>
			</div>
			<FormUI.ErrorText text={form.errMsg} />
			<FormUI.ErrorText text={formStore.response.message} />
		</Form>
	)
}

function LogBtn() {
	const { form, formStore, type } = useController()
	return (
		<Button.Borderless
			type="button"
			class="w-1/4 self-start py-1"
			onClick={() => {
				console.log("form changed: ", form.changed)
				console.log("form error: ", getErrors(formStore))
				console.log("form value: ", getValues(formStore))
				console.log(type.value)
			}}>
			Log
		</Button.Borderless>
	)
}

function Name() {
	const { artistData, formStore, t } = useController()
	return (
		<Field
			of={formStore}
			name="name">
			{(field, props) => (
				<div class="flex flex-col">
					<label
						for="name"
						class={h4Class}>
						{t("name.label")}
					</label>
					<input
						{...props}
						type="text"
						class={`h-7 w-2/3 rounded border border-gray-400 px-2 outline-none focus:border-blue-700 focus:ring-1 focus:ring-blue-600`}
						classList={{
							"invalid:focus:ring-red-800 invalid:focus:border-red-800":
								field.error.length > 0,
						}}
						value={artistData ? artistData.name : undefined}
						placeholder={t("name.placeholder")}
						required
					/>
					{field.error && <FormUI.ErrorText text={field.error} />}
				</div>
			)}
		</Field>
	)
}

function Type() {
	const { artistData, formStore, type, t } = useController()
	return (
		<div class="flex flex-col">
			<h4 class={h4Class}>{t("artist_type.label")}</h4>
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
								checked={artistData?.artist_type === "Person"}
								onChange={() => type.toPerson()}
							/>
							<label for="artist_type_person">{t("artist_type.person")}</label>
						</div>
						<div class="flex">
							<input
								{...props}
								type="radio"
								id="artist_type_group"
								value="Group"
								checked={artistData?.artist_type === "Group"}
								onChange={() => type.toGroup()}
							/>
							<label for="artist_type_group">{t("artist_type.group")}</label>
						</div>
						{field.error && <FormUI.ErrorText text={field.error} />}
					</>
				)}
			</Field>
		</div>
	)
}

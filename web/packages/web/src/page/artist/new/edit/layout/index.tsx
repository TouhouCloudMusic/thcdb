import { Field, Form, getErrors, getValues } from "@modular-forms/solid"
import { useAction } from "@solidjs/router"
import { type Accessor, createMemo, Show, Suspense } from "solid-js"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { type Nullable } from "~/lib/type/nullable"
import { useI18N } from "~/state/i18n"
import { Context, useController } from "../context"
import { Action, Query } from "../data"
import { createController } from "../data/controller"
import { type ArtistByID } from "../data/type"
import { ArtistType } from "./components/artist_type"
import { Member } from "./components/member"
import { Name } from "./components/name"

export function ArtistFormLayout(props: {
	data?: Accessor<Nullable<ArtistByID>>
}) {
	const data = createMemo(() => props.data?.() ?? null)
	const dictQuery = Query.fetchDict(useI18N().locale)
	const dict = createMemo(() => dictQuery.data!)

	return (
		<Suspense>
			<Context.Provider value={createController(data, dict)}>
				<Button.Borderless>
					<a href={"/artist/edit/" + Math.max(Number(data()?.app_id) - 1, 1)}>
						prev
					</a>
				</Button.Borderless>
				<Button.Borderless>
					<a href={"/artist/edit/" + (Number(data()?.app_id) + 1)}>next</a>
				</Button.Borderless>
				<Main />
			</Context.Provider>
		</Suspense>
	)
}

function Main() {
	const { artistData, formStore, form, t } = useController()
	const action = useAction(Action.submit)
	return (
		<Form
			of={formStore()}
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
				of={formStore()}
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
			<ArtistType />
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
			<FormUI.ErrorText text={formStore().response.message} />
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
				console.log("form error: ", getErrors(formStore()))
				console.log("form value: ", getValues(formStore()))
				console.log(type.value)
			}}>
			Log
		</Button.Borderless>
	)
}

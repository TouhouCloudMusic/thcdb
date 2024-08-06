import { Form, getErrors, getValues } from "@modular-forms/solid"
import { useAction } from "@solidjs/router"
import { useQueryClient } from "@tanstack/solid-query"
import { createMemo, Show, Suspense, type Accessor } from "solid-js"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { type Nullable } from "~/lib/type/nullable"
import { useI18N } from "~/state/i18n"
import { Context, useController } from "../context"
import { createController, Query, SubmitAction, type ArtistByID } from "../data"
import { ArtistType, MemberList, Name } from "./components"

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
	const action = useAction(SubmitAction)
	const queryClient = useQueryClient()
	return (
		<Form
			of={formStore()}
			onSubmit={async (formData) => {
				if (!form.changed) {
					form.setErrMsg("No changes")
					return
				}
				await action(queryClient, formData, artistData())
			}}
			method="post"
			class="flex flex-col gap-2">
			<Name />
			<ArtistType />
			<MemberList />
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
	const { form, formStore, artistType } = useController()
	return (
		<Button.Borderless
			type="button"
			class="w-1/4 self-start py-1"
			onClick={() => {
				console.log("form changed: ", form.changed)
				console.log("form error: ", getErrors(formStore()))
				console.log(
					"form value: ",
					getValues(formStore(), {
						shouldActive: false,
					})
				)
			}}>
			Log
		</Button.Borderless>
	)
}

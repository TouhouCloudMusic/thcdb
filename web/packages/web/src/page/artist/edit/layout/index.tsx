import { Form, getErrors, getValues } from "@modular-forms/solid"
import { useAction } from "@solidjs/router"
import { useQueryClient, type CreateQueryResult } from "@tanstack/solid-query"
import { Show } from "solid-js"
import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui/index.tsx"
import { type Nullable } from "~/lib/type/nullable"
import { useI18N } from "~/state/i18n"
import { ControllerContext, useController } from "../context.tsx"
import {
	createController,
	Query,
	SubmitAction,
	type ArtistByID,
} from "../data/index.ts"
import { Aliases, ArtistType, ID, MemberList, Name } from "./sections/index.ts"

export function ArtistFormLayout(props: {
	dataQuery?: CreateQueryResult<Nullable<ArtistByID>>
}) {
	const dictQuery = Query.fetchDict(useI18N().locale)
	const dict = () => dictQuery.data
	return (
		<Show when={dict()}>
			{(dict) => (
				<ControllerContext.Provider
					value={createController(props.dataQuery, dict)}>
					<Main />
				</ControllerContext.Provider>
			)}
		</Show>
	)
}

function Main() {
	const { dataQuery, formStore, form, t, initData } = useController()
	const action = useAction(SubmitAction)
	const queryClient = useQueryClient()
	return (
		<main class="flex w-full place-content-center">
			<Form
				of={formStore}
				onSubmit={async (formData) => {
					if (!form.changed) {
						form.setErrMsg("No changes")
						return
					}
					await action(queryClient, formData, dataQuery?.data)
				}}
				method="post"
				class="flex w-2/3 flex-col gap-2">
				{/* Dev only */}
				<div class="flex min-w-48 place-content-between gap-2 self-center">
					<Button.Borderless>
						<a
							href={
								(dataQuery?.data?.app_id ?? 0) - 1 !== 0 ?
									`/artist/edit/${(initData()?.app_id ?? 0) - 1}`
								:	"/artist/new"
							}
							preload={false}>
							prev
						</a>
					</Button.Borderless>
					<Button.Borderless>
						<a
							href={"/artist/edit/" + ((initData()?.app_id ?? 0) + 1)}
							preload={false}>
							next
						</a>
					</Button.Borderless>
				</div>
				<ID />
				<Name />
				<ArtistType />
				<Aliases />
				<MemberList />
				<div class="flex w-full flex-row place-content-around">
					<Button.Highlight
						type="submit"
						class="w-1/4 self-start py-1">
						{t.submit()}
					</Button.Highlight>
					<Show when={import.meta.env.DEV}>
						<LogBtn />
					</Show>
				</div>
				<FormUI.ErrorText text={form.errMsg} />
				<FormUI.ErrorText text={formStore.response.message} />
			</Form>
		</main>
	)
}

function LogBtn() {
	const { form, formStore } = useController()
	return (
		<Button.Borderless
			type="button"
			class="w-1/4 self-start py-1"
			onClick={() => {
				console.info("form changed: ", form.changed)
				console.info("form error: ", getErrors(formStore))
				console.info(
					"form value: ",
					getValues(formStore, {
						shouldActive: false,
					})
				)
			}}>
			Log
		</Button.Borderless>
	)
}

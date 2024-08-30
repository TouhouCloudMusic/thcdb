import { getErrors, getValues, type SubmitHandler } from "@modular-forms/solid"
import { useAction, useNavigate } from "@solidjs/router"
import { useQueryClient, type CreateQueryResult } from "@tanstack/solid-query"
import { Show } from "solid-js"

import { Button } from "~/component/button"
import { FormUI } from "~/component/form/ui"
import { type Nullable } from "~/lib/type/nullable"
import { useI18N } from "~/state/i18n"

import { ControllerContext, useController } from "../context.tsx"
import {
	createController,
	Query,
	SubmitAction,
	type ArtistByID,
} from "../data/index.ts"

import { type ArtistFormSchema } from "../data/form/index.ts"
import { Aliases } from "./sections/alias.tsx"
import { ArtistType } from "./sections/artist_type.tsx"
import { ID } from "./sections/id.tsx"
import { MemberList } from "./sections/member.tsx"
import { Name } from "./sections/name.tsx"

export function ArtistFormLayout(props: {
	dataQuery?: CreateQueryResult<Nullable<ArtistByID>>
}) {
	const dictQuery = Query.fetchDict(useI18N().locale)

	return (
		<Show when={dictQuery.data}>
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
	const { dataQuery, formStore, form, t, Form } = useController()
	const action = useAction(SubmitAction)
	const queryClient = useQueryClient()
	const navigate = useNavigate()

	const handleSubmit: SubmitHandler<ArtistFormSchema> = async (formData) => {
		if (!form.changed) {
			form.setErrMsg("No changes")
			return
		}

		const res = await action(formData, dataQuery?.data)
		void queryClient.invalidateQueries({
			queryKey: Query.dataQueryKey.concat(res.toString()),
		})
		return navigate(`/artist/${res}`)
	}

	return (
		<main class="flex w-full place-content-center">
			<Form
				onSubmit={handleSubmit}
				method="post"
				class="flex w-2/3 flex-col gap-2">
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

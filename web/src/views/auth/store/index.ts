import {
	createFormStore,
	FormError,
	valiForm,
	type SubmitHandler,
	type FormStore,
} from "@modular-forms/solid"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { createEffect, createMemo, createSignal } from "solid-js"

import { FetchClient, AuthSchema } from "~/api"
import { useUserCtx } from "~/state/user"

export type AuthFormMode = "sign_in" | "sign_up"

const RouteApi = getRouteApi("/auth")

export function useAuthForm() {
	const searchParams = RouteApi.useSearch()
	const [mode, setMode] = createSignal<AuthFormMode>(searchParams().type)

	createEffect(() => {
		setMode(searchParams().type)
	})

	const formStore = createMemo(() => {
		if (mode() == "sign_in") {
			return createFormStore<AuthSchema.SignIn>({
				validate: valiForm(AuthSchema.SignIn),
			}) as FormStore<AuthSchema.SignIn>
		} else {
			return createFormStore<AuthSchema.SignUp>({
				validate: valiForm(AuthSchema.SignUp),
			}) as FormStore<AuthSchema.SignUp>
		}
	})

	const userCtx = useUserCtx()
	const nav = useNavigate()

	const handleSubmit: SubmitHandler<AuthSchema.SignIn> = async (values, _) => {
		let { data, error } =
			mode() === "sign_in" ?
				await FetchClient.POST("/sign_in", {
					body: {
						username: values.username,
						password: values.password,
					},
				})
			:	await FetchClient.POST("/sign_up", {
					body: {
						username: values.username,
						password: values.password,
					},
				})

		if (error) {
			throw new FormError<AuthSchema.SignIn>(error.message)
		}

		if (data) {
			userCtx.sign_in({
				user: data.data,
			})
			return nav({ to: "/" })
		}
	}

	return {
		mode,
		setMode,
		formStore: formStore,
		handleSubmit: handleSubmit,
	}
}

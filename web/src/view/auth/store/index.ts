import { createForm } from "@formisch/solid"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createEffect, createSignal } from "solid-js"
import type { InferOutput } from "valibot"

import * as AuthSchema from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"

export type AuthFormMode = "sign_in" | "sign_up"

const RouteApi = getRouteApi("/auth")

export function useAuthForm() {
	const searchParams = RouteApi.useSearch()
	const [mode, setMode] = createSignal<AuthFormMode>(searchParams().type)

	createEffect(() => {
		setMode(searchParams().type)
	})

	const signInForm = createForm({
		schema: AuthSchema.SignIn,
	})
	const signUpForm = createForm({
		schema: AuthSchema.SignUp,
	})

	const [submitError, setSubmitError] = createSignal<string | undefined>(
		undefined,
	)

	const userCtx = useCurrentUser()
	const nav = useNavigate()

	createEffect(() => {
		mode()
		setSubmitError(undefined)
	})

	const handleSignIn = async (
		values: InferOutput<typeof AuthSchema.SignIn>,
	) => {
		const result = await AuthApi.signin({ body: values })

		return Either.match(result, {
			onLeft: (error) => {
				setSubmitError(error.error)
			},
			onRight: (data) => {
				if (!data) return
				userCtx.sign_in({ user: data })
				return nav({ to: "/" })
			},
		})
	}

	const handleSignUp = async (
		values: InferOutput<typeof AuthSchema.SignUp>,
	) => {
		const result = await AuthApi.signup({
			body: {
				username: values.username,
				password: values.password,
			},
		})

		return Either.match(result, {
			onLeft: (error) => {
				setSubmitError(error.error)
			},
			onRight: (data) => {
				if (!data) return
				userCtx.sign_in({ user: data })
				return nav({ to: "/" })
			},
		})
	}

	return {
		mode,
		setMode,
		signInForm,
		signUpForm,
		submitError,
		handleSignIn,
		handleSignUp,
	}
}

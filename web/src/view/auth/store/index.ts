import { createForm } from "@formisch/solid"
import { createWritableMemo } from "@solid-primitives/memo"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createEffect, createSignal, onCleanup } from "solid-js"
import type * as v from "valibot"

import * as AuthSchema from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"

import {
	clearVerificationEmail,
	getVerificationEmail,
	saveVerificationEmail,
} from "../verify_email/session"
import { updateVerifyEmailState } from "../verify_email/state"
import type { VerifyEmailState } from "../verify_email/state"

export type AuthFormMode = "sign_in" | "sign_up" | "verify_email"

const RouteApi = getRouteApi("/auth/")

type OnAuthError = (message: string) => void

type EitherRight<T> =
	T extends Either.Either<infer Right, unknown> ? Right : never

type SignInData = NonNullable<
	EitherRight<Awaited<ReturnType<typeof AuthApi.signin>>>
>
type SignUpData = EitherRight<Awaited<ReturnType<typeof AuthApi.signup>>>
type VerifyEmailData = NonNullable<
	EitherRight<Awaited<ReturnType<typeof AuthApi.verifyEmail>>>
>

const resolveAuthFormMode = (value: string | undefined): AuthFormMode => {
	if (value === "sign_up" || value === "verify_email") return value
	return "sign_in"
}

async function executeSignIn(params: {
	values: v.InferOutput<typeof AuthSchema.SignIn>
	onError: OnAuthError
	onSuccess: (data: SignInData) => void | Promise<void>
}) {
	const result = await AuthApi.signin({
		body: {
			username: params.values.identifier,
			password: params.values.password,
		},
	})

	return Either.match(result, {
		onLeft: (error) => {
			params.onError(error.error)
		},
		onRight: async (data) => {
			await params.onSuccess(data)
		},
	})
}

async function executeSignUp(params: {
	values: v.InferOutput<typeof AuthSchema.SignUp>
	onError: OnAuthError
	onSuccess: (data: SignUpData, email: string) => void | Promise<void>
}) {
	const result = await AuthApi.signup({
		body: {
			username: params.values.username,
			email: params.values.email,
			password: params.values.password,
		},
	})

	return Either.match(result, {
		onLeft: (error) => {
			params.onError(error.error)
		},
		onRight: async (data) => {
			await params.onSuccess(data, params.values.email)
		},
	})
}

async function executeVerifyEmail(params: {
	values: v.InferOutput<typeof AuthSchema.VerifyEmail>
	email: string
	onError: OnAuthError
	onSuccess: (data: VerifyEmailData) => void | Promise<void>
}) {
	const result = await AuthApi.verifyEmail({
		body: {
			email: params.email,
			code: params.values.code,
		},
	})

	return Either.match(result, {
		onLeft: (error) => {
			params.onError(error.error)
		},
		onRight: async (data) => {
			await params.onSuccess(data)
		},
	})
}

export function useAuthForm() {
	const userCtx = useCurrentUser()
	const nav = useNavigate()
	const searchParams = RouteApi.useSearch()

	const [mode, setMode] = createWritableMemo<AuthFormMode>(() =>
		resolveAuthFormMode(searchParams().type),
	)

	const signInForm = createForm({
		schema: AuthSchema.SignIn,
	})
	const signUpForm = createForm({
		schema: AuthSchema.SignUp,
	})
	const verifyEmailForm = createForm({
		schema: AuthSchema.VerifyEmail,
		initialInput: {
			code: "",
		},
	})

	const [submitError, setSubmitError] = createSignal<string>()
	const [submitInfo, setSubmitInfo] = createSignal<string>()
	const [verifyEmailState, setVerifyEmailState] =
		createSignal<VerifyEmailState>({ type: "inactive" })

	createEffect(() => {
		mode()
		setSubmitError(undefined)
		setSubmitInfo(undefined)
	})

	createEffect(() => {
		const currentMode = mode()
		setVerifyEmailState((state) =>
			updateVerifyEmailState(state, {
				type: "sync",
				mode: currentMode,
			}),
		)
	})

	createEffect(() => {
		const state = verifyEmailState()
		if (state.type !== "cooldown") return

		const timer = setInterval(() => {
			setVerifyEmailState((current) =>
				updateVerifyEmailState(current, { type: "tick" }),
			)
		}, 1000)

		onCleanup(() => {
			clearInterval(timer)
		})
	})

	const resendCooldownSeconds = () => {
		const state = verifyEmailState()
		if (state.type !== "cooldown") return 0
		return state.seconds
	}

	const isResendingVerificationEmail = () =>
		verifyEmailState().type === "resending"
	const isMissingVerifyEmailSession = () =>
		verifyEmailState().type === "missing_session"

	async function handleSignIn(values: v.InferOutput<typeof AuthSchema.SignIn>) {
		await executeSignIn({
			values,
			onError(message) {
				setSubmitError(message)
			},
			onSuccess: async (data) => {
				clearVerificationEmail()
				userCtx.sign_in({ user: data })
				await nav({ to: "/" })
			},
		})
	}

	async function handleSignUp(values: v.InferOutput<typeof AuthSchema.SignUp>) {
		await executeSignUp({
			values,
			onError(message) {
				setSubmitError(message)
			},
			onSuccess: async (data, email) => {
				saveVerificationEmail(email)
				setVerifyEmailState((state) =>
					updateVerifyEmailState(state, {
						type: "seed_after_signup",
						email,
						cooldownSeconds: data.resend_cooldown_seconds,
					}),
				)
				await nav({
					to: "/auth",
					search: {
						type: "verify_email",
					},
				})
			},
		})
	}

	async function handleVerifyEmail(
		values: v.InferOutput<typeof AuthSchema.VerifyEmail>,
	) {
		const email = verifyEmailState().email
		if (email === undefined) {
			setSubmitError("Missing signup email, please sign up again")
			return
		}

		await executeVerifyEmail({
			values,
			email,
			onError(message) {
				setSubmitError(message)
			},
			onSuccess: async (data) => {
				clearVerificationEmail()
				userCtx.sign_in({ user: data })
				await nav({ to: "/" })
			},
		})
	}

	const handleResendVerificationEmail = async () => {
		const email = verifyEmailState().email
		if (!email) {
			setSubmitError("Missing signup email, please sign up again")
			return
		}
		if (isResendingVerificationEmail() || resendCooldownSeconds() > 0) return

		setSubmitError(undefined)
		setSubmitInfo(undefined)
		setVerifyEmailState((state) =>
			updateVerifyEmailState(state, { type: "start_resend" }),
		)

		const result = await AuthApi.resendVerificationEmail({
			body: { email },
		})

		Either.match(result, {
			onLeft: (error) => {
				setSubmitError(error.error)
				setVerifyEmailState((state) =>
					updateVerifyEmailState(state, { type: "resend_failed" }),
				)
			},
			onRight: (data) => {
				setSubmitInfo("If eligible, a verification code has been sent.")
				setVerifyEmailState((state) =>
					updateVerifyEmailState(state, {
						type: "resend_success",
						cooldownSeconds: data.resend_cooldown_seconds,
					}),
				)
			},
		})
	}

	return {
		mode,
		setMode,
		signInForm,
		signUpForm,
		verifyEmailForm,
		resendCooldownSeconds,
		isResendingVerificationEmail,
		isMissingVerifyEmailSession,
		verificationEmail: getVerificationEmail,
		submitError,
		submitInfo,
		handleSignIn,
		handleSignUp,
		handleVerifyEmail,
		handleResendVerificationEmail,
	}
}

import { createForm } from "@formisch/solid"
import { createWritableMemo } from "@solid-primitives/memo"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createEffect, createSignal, onCleanup } from "solid-js"
import type * as v from "valibot"

import * as AuthSchema from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"

export type AuthFormMode = "sign_in" | "sign_up" | "verify_email"

const RouteApi = getRouteApi("/auth")

const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60

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

type VerifyEmailFlowState =
	| { type: "inactive"; email?: undefined; seconds?: undefined }
	| {
			type: "missing_session"
			email?: undefined
			seconds?: undefined
	  }
	| { type: "ready"; email: string; seconds?: undefined }
	| { type: "resending"; email: string; seconds?: undefined }
	| { type: "cooldown"; email: string; seconds: number }

type VerifyEmailFlowEvent =
	| {
			type: "sync"
			mode: AuthFormMode
			email: string | undefined
	  }
	| {
			type: "seed_after_signup"
			email: string
			cooldownSeconds: number
	  }
	| { type: "start_resend" }
	| { type: "resend_failed" }
	| { type: "resend_success"; cooldownSeconds: number }
	| { type: "tick" }

const resolveAuthFormMode = (value: string | undefined): AuthFormMode => {
	if (value === "sign_up" || value === "verify_email") return value
	return "sign_in"
}

function VerifyEmailFlowState_update(
	state: VerifyEmailFlowState,
	event: VerifyEmailFlowEvent,
): VerifyEmailFlowState {
	// oxlint-disable-next-line default-case
	switch (event.type) {
		case "sync": {
			if (event.mode !== "verify_email") return { type: "inactive" }
			if (!event.email) return { type: "missing_session" }

			if (
				(state.type === "ready"
					|| state.type === "resending"
					|| state.type === "cooldown")
				&& state.email === event.email
			) {
				return state
			}

			return { type: "ready", email: event.email }
		}
		case "seed_after_signup": {
			return {
				type: "cooldown",
				email: event.email,
				seconds: event.cooldownSeconds,
			}
		}
		case "start_resend": {
			if (state.type !== "ready") return state
			return { type: "resending", email: state.email }
		}
		case "resend_failed": {
			if (state.type !== "resending") return state
			return { type: "ready", email: state.email }
		}
		case "resend_success": {
			if (state.type !== "resending") return state
			return {
				type: "cooldown",
				email: state.email,
				seconds: event.cooldownSeconds,
			}
		}
		case "tick": {
			if (state.type !== "cooldown") return state
			if (state.seconds <= 1) {
				return { type: "ready", email: state.email }
			}
			return { ...state, seconds: state.seconds - 1 }
		}
	}
}

async function executeSignIn(params: {
	values: v.InferOutput<typeof AuthSchema.SignIn>
	onError: OnAuthError
	onSuccess: (data: SignInData) => void | Promise<void>
}) {
	const result = await AuthApi.signin({ body: params.values })

	return Either.match(result, {
		onLeft: (error) => {
			params.onError(error.error)
		},
		onRight: (data) => {
			if (!data) return
			return params.onSuccess(data)
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
		onRight: (data) => {
			return params.onSuccess(data, params.values.email)
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
		onRight: (data) => {
			if (!data) return
			return params.onSuccess(data)
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
	const [verifyEmailFlowState, setVerifyEmailFlowState] =
		createSignal<VerifyEmailFlowState>({ type: "inactive" })

	const getVerificationEmail = () => {
		const email = searchParams().email?.trim()
		if (!email) return
		return email
	}

	createEffect(() => {
		mode()
		setSubmitError(undefined)
		setSubmitInfo(undefined)
	})

	createEffect(() => {
		const currentMode = mode()
		const email = getVerificationEmail()
		setVerifyEmailFlowState((state) =>
			VerifyEmailFlowState_update(state, {
				type: "sync",
				mode: currentMode,
				email,
			}),
		)
	})

	createEffect(() => {
		const state = verifyEmailFlowState()
		if (state.type !== "cooldown") return

		const timer = setInterval(() => {
			setVerifyEmailFlowState((current) =>
				VerifyEmailFlowState_update(current, { type: "tick" }),
			)
		}, 1000)

		onCleanup(() => {
			clearInterval(timer)
		})
	})

	const resendCooldownSeconds = () => {
		const state = verifyEmailFlowState()
		if (state.type !== "cooldown") return 0
		return state.seconds
	}

	const isResendingVerificationEmail = () =>
		verifyEmailFlowState().type === "resending"

	const handleSignIn = (values: v.InferOutput<typeof AuthSchema.SignIn>) =>
		executeSignIn({
			values,
			onError: setSubmitError,
			onSuccess: (data) => {
				userCtx.sign_in({ user: data })
				return nav({ to: "/" })
			},
		})

	const handleSignUp = (values: v.InferOutput<typeof AuthSchema.SignUp>) =>
		executeSignUp({
			values,
			onError: setSubmitError,
			onSuccess: (data, email) => {
				setVerifyEmailFlowState((state) =>
					VerifyEmailFlowState_update(state, {
						type: "seed_after_signup",
						email,
						cooldownSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
					}),
				)
				return nav({
					to: "/auth",
					search: {
						type: "verify_email",
						email,
					},
				})
			},
		})

	const handleVerifyEmail = (
		values: v.InferOutput<typeof AuthSchema.VerifyEmail>,
	) => {
		const email = verifyEmailFlowState().email
		if (!email) {
			setSubmitError("Missing signup email, please sign up again")
			return
		}

		return executeVerifyEmail({
			values,
			email,
			onError: setSubmitError,
			onSuccess: (data) => {
				userCtx.sign_in({ user: data })
				return nav({ to: "/" })
			},
		})
	}

	const handleResendVerificationEmail = async () => {
		const email = verifyEmailFlowState().email
		if (!email) {
			setSubmitError("Missing signup email, please sign up again")
			return
		}
		if (isResendingVerificationEmail() || resendCooldownSeconds() > 0) return

		setSubmitError(undefined)
		setSubmitInfo(undefined)
		setVerifyEmailFlowState((state) =>
			VerifyEmailFlowState_update(state, { type: "start_resend" }),
		)

		const result = await AuthApi.resendVerificationEmail({
			body: { email },
		})

		return Either.match(result, {
			onLeft: (error) => {
				setSubmitError(error.error)
				setVerifyEmailFlowState((state) =>
					VerifyEmailFlowState_update(state, { type: "resend_failed" }),
				)
			},
			onRight: (data) => {
				if (!data) {
					setVerifyEmailFlowState((state) =>
						VerifyEmailFlowState_update(state, {
							type: "resend_failed",
						}),
					)
					return
				}
				setSubmitInfo("If eligible, a verification code has been sent.")
				setVerifyEmailFlowState((state) =>
					VerifyEmailFlowState_update(state, {
						type: "resend_success",
						cooldownSeconds: VERIFICATION_RESEND_COOLDOWN_SECONDS,
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
		verificationEmail: getVerificationEmail,
		submitError,
		submitInfo,
		handleSignIn,
		handleSignUp,
		handleVerifyEmail,
		handleResendVerificationEmail,
	}
}

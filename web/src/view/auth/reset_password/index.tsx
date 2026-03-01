import {
	Field,
	Form,
	createForm,
	getInput,
	setErrors,
	setInput,
} from "@formisch/solid"
import { Link, Navigate, useNavigate } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import {
	createSignal,
	Match,
	onCleanup,
	onMount,
	Show,
	Switch,
	untrack,
} from "solid-js"
import type * as v from "valibot"
import {
	email as emailSchema,
	maxLength,
	minLength,
	pipe,
	regex,
	safeParse,
	string,
} from "valibot"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import {
	ResetPassword as ResetPasswordSchema,
	VerifyResetCode as VerifyResetCodeSchema,
} from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"

import { AuthLeftPanel } from "../component/AuthLeftPanel"
import { EmailField } from "../component/EmailField"
import { PasswordField } from "../component/PasswordField"
import { VerificationCodeField } from "../component/VerificationCodeField"
import {
	requestForgotPassword,
	requestResetPassword,
	requestVerifyResetCode,
} from "./request"
import { resetPasswordByKey } from "./reset_password_by_key"
import { sendResetCode } from "./send_reset_code"
import {
	clearResetPasswordEmail,
	clearResetPasswordSuccess,
	getResetPasswordEmail,
	clearResetPasswordSession,
	getResetPasswordSession,
	hasResetPasswordSuccess,
	markResetPasswordSuccess,
	saveResetPasswordEmail,
	saveResetPasswordSession,
} from "./session"
import { createResetPasswordUiStore } from "./store"
import { verifyResetCode } from "./verify_reset_code"

type ResetPasswordStep = "reset" | "success"

type Props = {
	step?: ResetPasswordStep
}

type VerifyResetCodeValues = v.InferOutput<typeof VerifyResetCodeSchema>
type ResetPasswordValues = v.InferOutput<typeof ResetPasswordSchema>

const RESET_PASSWORD_EMAIL_SCHEMA = pipe(
	string(),
	minLength(1, "Email is required"),
	emailSchema("Invalid email"),
)
const RESET_PASSWORD_CODE_SCHEMA = pipe(
	string(),
	minLength(6, "Verification code must be 6 digits"),
	maxLength(6, "Verification code must be 6 digits"),
	regex(/^\d{6}$/, "Invalid verification code"),
)
const RESET_SESSION_REQUIRED_MESSAGE =
	"Your reset session is no longer valid. Verify a new code to continue."

function formatMinuteCount(minutes: number) {
	return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

function getEmailErrors(input: string): [string, ...string[]] | null {
	const result = safeParse(RESET_PASSWORD_EMAIL_SCHEMA, input.trim())
	if (result.success) return null
	const issue = result.issues[0]
	return [issue.message]
}

function getCodeErrors(input: string): [string, ...string[]] | null {
	const result = safeParse(RESET_PASSWORD_CODE_SCHEMA, input)
	if (result.success) return null
	const issue = result.issues[0]
	return [issue.message]
}

function buildAuthLayout(props: {
	title: string
	description?: JSX.Element
	body: JSX.Element
}) {
	return (
		<div class="h-full relative overflow-hidden bg-linear-to-br from-reimu-100 via-primary to-marisa-100">
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-size-[22px_22px] opacity-55"></div>
			<div class="grid h-full w-full items-stretch lg:grid-cols-[1.05fr_0.95fr]">
				<AuthLeftPanel />

				<div class="flex flex-col justify-center border-t border-slate-300 bg-primary/70 px-4 py-12 backdrop-blur-sm sm:px-8 lg:border-l lg:border-t-0 xl:px-14">
					<div class="mx-auto w-full max-w-[420px]">
						<div class="mb-4 space-y-1">
							<div class="text-primary text-3xl font-light tracking-tight">
								{props.title}
							</div>
							<Show when={props.description !== undefined}>
								<div class="text-sm text-tertiary">{props.description}</div>
							</Show>
						</div>

						{props.body}
					</div>
				</div>
			</div>
		</div>
	)
}

function VerifyStepHeader(props: {
	email: string
	isSendingCode: boolean
	onChangeEmail(): void
}) {
	return (
		<div class="mb-4 flex items-center justify-between gap-3 rounded-md border border-slate-300/80 bg-primary/80 px-3 py-2.5">
			<div class="min-w-0 flex-1">
				<div class="wrap-break-word text-sm font-medium text-primary">
					{props.email}
				</div>
			</div>
			<Show when={!props.isSendingCode}>
				<Button
					type="button"
					variant="Tertiary"
					size="Xs"
					class="h-7 shrink-0 self-center px-2"
					onClick={() => props.onChangeEmail()}
				>
					Change
				</Button>
			</Show>
		</div>
	)
}

function ForgotPasswordVerifyView(props: {
	sessionWarning?: string
	uiStore: ReturnType<typeof createResetPasswordUiStore>
}) {
	onMount(() => {
		clearResetPasswordSession()
		clearResetPasswordSuccess()
	})

	const nav = useNavigate()
	const [isCodeEditing, setIsCodeEditing] = createSignal(false)
	const form = createForm({
		schema: VerifyResetCodeSchema,
		validate: "submit",
		revalidate: "input",
		initialInput: {
			email: untrack(() => getResetPasswordEmail() ?? ""),
			code: "",
		},
	})

	const emailValue = () => getInput(form).email
	const codeValue = () => getInput(form).code ?? ""
	const trimmedEmailValue = () => emailValue()?.trim() ?? ""
	const emailErrors = () => getEmailErrors(trimmedEmailValue())
	const codeErrors = () => getCodeErrors(codeValue())
	const isEmailValid = () => emailErrors() === null
	const isCodeValid = () => codeErrors() === null
	const isVerifyStep = () =>
		props.uiStore.state.isSendingCode || props.uiStore.state.hasSentCode
	const isSubmitDisabled = () =>
		form.isSubmitting
		|| props.uiStore.state.isSendingCode
		|| props.uiStore.state.isVerifyingCode
		|| (!isVerifyStep() && !isEmailValid())
		|| (isVerifyStep() && !isCodeValid())
	const continueButtonType = () => (isVerifyStep() ? "submit" : "button")

	const handleEmailChange = () => {
		setErrors(form, {
			path: ["email"],
			errors: emailErrors(),
		})
	}

	const handleEmailKeyDown = (e: KeyboardEvent) => {
		if (e.key !== "Enter" || isVerifyStep()) return
		e.preventDefault()
		if (isSubmitDisabled()) return
		void handleSendCode()
	}

	const handleCodeInput = () => {
		setErrors(form, {
			path: ["code"],
			errors: codeErrors(),
		})
	}

	let cooldownTimer: ReturnType<typeof globalThis.setInterval> | undefined

	const clearCooldownTimer = () => {
		if (cooldownTimer === undefined) return
		globalThis.clearInterval(cooldownTimer)
		cooldownTimer = undefined
	}

	onCleanup(clearCooldownTimer)

	const startCooldown = (seconds: number) => {
		props.uiStore.setCooldown(seconds)

		if (cooldownTimer !== undefined) {
			clearCooldownTimer()
		}

		if (seconds <= 0) return

		const tickCooldown = props.uiStore.tickCooldown
		const isCoolingDown = props.uiStore.isCoolingDown
		cooldownTimer = globalThis.setInterval(() => {
			tickCooldown()
			if (!isCoolingDown() && cooldownTimer !== undefined) {
				clearCooldownTimer()
			}
		}, 1000)
	}

	const resetSendCodeFlow = () => {
		clearCooldownTimer()
		props.uiStore.resetSendCodeFlow()
		setInput(form, {
			input: {
				email: getInput(form).email ?? "",
				code: "",
			},
		})
	}

	const handleSendCode = async () => {
		if (props.uiStore.state.isSendingCode || props.uiStore.isCoolingDown()) {
			return
		}

		const email = trimmedEmailValue()
		if (email.length === 0) return
		saveResetPasswordEmail(email)

		await sendResetCode({
			email,
			forgotPassword: requestForgotPassword,
			startCooldown,
			uiStore: props.uiStore,
		})
	}

	const handleVerifyCode = async (values: VerifyResetCodeValues) => {
		const email = values.email.trim()

		await verifyResetCode({
			email,
			code: values.code,
			verifyResetCode: requestVerifyResetCode,
			onSuccess: async (session) => {
				saveResetPasswordEmail(email)
				saveResetPasswordSession(session)
				await nav({
					to: "/auth/forgot-password",
					search: {
						step: "reset",
					},
				})
			},
			uiStore: props.uiStore,
		})
	}

	const handleSubmit = async (values: VerifyResetCodeValues) => {
		if (isVerifyStep()) {
			await handleVerifyCode(values)
			return
		}

		await handleSendCode()
	}

	return buildAuthLayout({
		title: "Forgot password",
		body: (
			<Form
				of={form}
				onSubmit={handleSubmit}
				class="w-full"
			>
				<Show when={props.sessionWarning !== undefined}>
					<div class="mb-4 text-sm text-tertiary">{props.sessionWarning}</div>
				</Show>

				<Switch>
					<Match when={isVerifyStep() && isEmailValid()}>
						<>
							<VerifyStepHeader
								email={trimmedEmailValue()}
								isSendingCode={props.uiStore.state.isSendingCode}
								onChangeEmail={resetSendCodeFlow}
							/>
							<Field
								of={form}
								path={["code"]}
							>
								{(field) => (
									<>
										<div class="mt-4 flex items-start gap-2">
											<div class="grow">
												<VerificationCodeField
													field={field}
													onInput={handleCodeInput}
													onFocus={() => {
														setIsCodeEditing(true)
													}}
													onBlur={() => {
														setIsCodeEditing(false)
													}}
													hideError
												/>
											</div>
											<Button
												type="button"
												variant="SecondaryV2"
												size="Sm"
												class="h-9 self-end"
												disabled={
													form.isSubmitting
													|| props.uiStore.state.isSendingCode
													|| props.uiStore.isCoolingDown()
												}
												onClick={() => {
													void handleSendCode()
												}}
											>
												{props.uiStore.state.isSendingCode
													? "Sending..."
													: props.uiStore.isCoolingDown()
														? `Resend (${props.uiStore.state.cooldownSeconds}s)`
														: "Resend code"}
											</Button>
										</div>
										<FormComp.ErrorMessage>
											{isCodeEditing() ? undefined : field.errors?.[0]}
										</FormComp.ErrorMessage>
									</>
								)}
							</Field>
						</>
					</Match>
					<Match when={true}>
						<Field
							of={form}
							path={["email"]}
						>
							{(field) => (
								<EmailField
									field={field}
									disabled={props.uiStore.state.isSendingCode}
									onChange={handleEmailChange}
									onKeyDown={handleEmailKeyDown}
								/>
							)}
						</Field>
					</Match>
				</Switch>

				<Show
					when={
						props.uiStore.state.verificationCodeExpiresMinutes !== undefined
					}
				>
					<div class="my-2 text-sm text-tertiary">
						Codes expire in {props.uiStore.state.verificationCodeExpiresMinutes}{" "}
						minutes.
					</div>
				</Show>

				<FormComp.ErrorMessage>
					{props.uiStore.state.sendCodeError}
				</FormComp.ErrorMessage>
				<FormComp.ErrorMessage>
					{props.uiStore.state.verifyCodeError}
				</FormComp.ErrorMessage>

				<Button
					type={continueButtonType()}
					variant="Primary"
					color="Reimu"
					size="Sm"
					class="mt-4 h-9 w-full"
					disabled={isSubmitDisabled()}
					onClick={() => {
						if (!isVerifyStep()) {
							void handleSendCode()
						}
					}}
				>
					Continue
				</Button>

				<div class="text-sm text-tertiary mt-4">
					Back to{" "}
					<Link
						to="/auth"
						search={{ type: "sign_in" }}
						class="text-secondary underline underline-offset-2"
					>
						sign in
					</Link>
					.
				</div>
			</Form>
		),
	})
}

function ResetPasswordWithKeyView(props: {
	resetKeyExpiresMinutes: number
	expiresAtMs: number
	uiStore: ReturnType<typeof createResetPasswordUiStore>
}) {
	const nav = useNavigate()
	let expiryTimer: ReturnType<typeof globalThis.setTimeout> | undefined
	const form = createForm({
		schema: ResetPasswordSchema,
		initialInput: {
			password: "",
			repeated_password: "",
		},
	})

	const clearExpiryTimer = () => {
		if (expiryTimer === undefined) return
		globalThis.clearTimeout(expiryTimer)
		expiryTimer = undefined
	}

	onCleanup(clearExpiryTimer)

	const redirectToSignIn = async () => {
		clearExpiryTimer()
		clearResetPasswordSession()
		clearResetPasswordEmail()
		clearResetPasswordSuccess()
		await nav({
			to: "/auth",
			search: { type: "sign_in" },
		})
	}

	onMount(() => {
		const remainingMs = props.expiresAtMs - Date.now()

		if (remainingMs <= 0) {
			void redirectToSignIn()
			return
		}

		expiryTimer = globalThis.setTimeout(() => {
			void redirectToSignIn()
		}, remainingMs)
	})

	const handleSubmit = async (values: ResetPasswordValues) => {
		await resetPasswordByKey({
			password: values.password,
			onInvalidResetKey() {
				clearResetPasswordSession()
				clearResetPasswordSuccess()
			},
			resetPasswordByKey: requestResetPassword,
			onSuccess: async () => {
				markResetPasswordSuccess()
				await nav({
					to: "/auth/forgot-password",
					search: {
						step: "success",
					},
				})
			},
			uiStore: props.uiStore,
		})
	}

	return buildAuthLayout({
		title: "Set a new password",
		description: (
			<>This is valid for {formatMinuteCount(props.resetKeyExpiresMinutes)}.</>
		),
		body: (
			<Form
				of={form}
				onSubmit={handleSubmit}
				class="w-full"
			>
				<Field
					of={form}
					path={["password"]}
				>
					{(field) => (
						<PasswordField
							label="New password"
							field={field}
							showRequirementHint
						/>
					)}
				</Field>

				<Field
					of={form}
					path={["repeated_password"]}
				>
					{(field) => (
						<PasswordField
							label="Repeat new password"
							field={field}
							class="mt-4"
						/>
					)}
				</Field>

				<FormComp.ErrorMessage>
					{props.uiStore.state.resetPasswordError}
				</FormComp.ErrorMessage>

				<Button
					type="submit"
					variant="Primary"
					color="Reimu"
					size="Sm"
					class="h-9 w-full mt-8"
					disabled={form.isSubmitting}
				>
					Reset password
				</Button>
			</Form>
		),
	})
}

function ResetPasswordSuccessView() {
	onMount(() => {
		clearResetPasswordSession()
	})

	return buildAuthLayout({
		title: "Password reset complete",
		description: <>Your password has been updated successfully.</>,
		body: (
			<div class="space-y-4">
				<div class="text-sm text-tertiary">
					You can now sign in with your new password.
				</div>
				<div class="text-sm text-tertiary">
					Back to{" "}
					<Link
						to="/auth"
						search={{ type: "sign_in" }}
						class="text-secondary underline underline-offset-2"
					>
						sign in
					</Link>
					.
				</div>
			</div>
		),
	})
}

export function ResetPasswordPage(props: Props) {
	const userStore = useCurrentUser()
	const uiStore = createResetPasswordUiStore()
	const isResetStep = () => props.step === "reset"
	const shouldShowSuccessView = () =>
		props.step === "success" && hasResetPasswordSuccess()
	const activeResetSession = () =>
		isResetStep() ? getResetPasswordSession() : undefined
	const shouldShowResetView = () => activeResetSession() !== undefined
	const shouldShowResetSessionWarning = () =>
		isResetStep() && activeResetSession() === undefined

	return (
		<Show
			when={!userStore.is_signed_in}
			fallback={<Navigate to="/" />}
		>
			<Switch>
				<Match when={shouldShowSuccessView()}>
					<ResetPasswordSuccessView />
				</Match>
				<Match
					when={shouldShowResetView() && activeResetSession() !== undefined}
				>
					<ResetPasswordWithKeyView
						resetKeyExpiresMinutes={activeResetSession()!.keyExpiresMinutes}
						expiresAtMs={activeResetSession()!.expiresAtMs}
						uiStore={uiStore}
					/>
				</Match>
				<Match when={true}>
					<ForgotPasswordVerifyView
						sessionWarning={
							shouldShowResetSessionWarning()
								? RESET_SESSION_REQUIRED_MESSAGE
								: undefined
						}
						uiStore={uiStore}
					/>
				</Match>
			</Switch>
		</Show>
	)
}

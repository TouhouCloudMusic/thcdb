import {
	Field,
	Form,
	createForm,
	getInput,
	setErrors,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, useNavigate } from "@tanstack/solid-router"
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
import { VerifyResetCode as VerifyResetCodeSchema } from "~/domain/auth/schema"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { EmailField } from "../component/EmailField"
import { VerificationCodeField } from "../component/VerificationCodeField"
import { authStyles } from "../styles"
import { requestForgotPassword, requestVerifyResetCode } from "./request"
import { sendResetCode } from "./send_reset_code"
import {
	clearResetPasswordSession,
	clearResetPasswordSessionWarning,
	clearResetPasswordSuccess,
	getResetPasswordEmail,
	hasResetPasswordSessionWarning,
	saveResetPasswordEmail,
	saveResetPasswordSession,
} from "./session"
import { createResetPasswordUiStore } from "./store"
import { verifyResetCode } from "./verify_reset_code"

const styles = stylex.create({
	recipient: {
		marginBottom: px[16],
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		paddingBottom: px[12],
	},
	recipientContent: { minWidth: "0rem", flex: "1 1 0%" },
	recipientAddress: {
		overflowWrap: "break-word",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	changeRecipient: {
		height: px[28],
		flexShrink: 0,
		alignSelf: "center",
		paddingInline: px[8],
	},
	form: { width: "100%" },
	instructions: {
		marginBottom: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	codeRow: {
		marginTop: px[16],
		display: "flex",
		alignItems: "flex-start",
		gap: px[8],
	},
	codeField: { flexGrow: 1 },
	resend: { height: px[36], alignSelf: "flex-end" },
	resendStatus: {
		marginBlock: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	submit: { marginTop: px[16], height: px[36], width: "100%" },
	signinPrompt: {
		marginTop: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	signinLink: {
		color: colors.textSecondary,
		textDecorationLine: "underline",
		textUnderlineOffset: "2px",
	},
})

type VerifyResetCodeValues = v.InferOutput<typeof VerifyResetCodeSchema>
type ResetPasswordEmailSchemaMessages = {
	required: string
	invalid: string
}
type ResetPasswordCodeSchemaMessages = {
	length: string
	invalid: string
}

function createResetPasswordEmailSchema(
	messages: ResetPasswordEmailSchemaMessages,
) {
	return pipe(
		string(),
		minLength(1, messages.required),
		emailSchema(messages.invalid),
	)
}

function createResetPasswordCodeSchema(
	messages: ResetPasswordCodeSchemaMessages,
) {
	return pipe(
		string(),
		minLength(6, messages.length),
		maxLength(6, messages.length),
		regex(/^\d{6}$/u, messages.invalid),
	)
}

function getEmailErrors(
	input: string,
	messages: ResetPasswordEmailSchemaMessages,
): [string, ...string[]] | null {
	const result = safeParse(
		createResetPasswordEmailSchema(messages),
		input.trim(),
	)
	if (result.success) return null
	return [result.issues[0].message]
}

function getCodeErrors(
	input: string,
	messages: ResetPasswordCodeSchemaMessages,
): [string, ...string[]] | null {
	const result = safeParse(createResetPasswordCodeSchema(messages), input)
	if (result.success) return null
	return [result.issues[0].message]
}

function VerifyStepHeader(props: {
	email: string
	isSendingCode: boolean
	onChangeEmail: () => void
}) {
	return (
		<div {...stylex.attrs(styles.recipient)}>
			<div {...stylex.attrs(styles.recipientContent)}>
				<div {...stylex.attrs(styles.recipientAddress)}>{props.email}</div>
			</div>
			<Show when={!props.isSendingCode}>
				<Button
					type="button"
					onClick={props.onChangeEmail}
					appearance="ghost"
					tone="gray"
					size="xs"
					styles={styles.changeRecipient}
				>
					Change
				</Button>
			</Show>
		</div>
	)
}

export function ForgotPasswordPage() {
	const { t } = useLingui()
	const nav = useNavigate()
	const uiStore = createResetPasswordUiStore()
	const shouldShowSessionWarning = hasResetPasswordSessionWarning()
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

	onMount(() => {
		clearResetPasswordSession()
		clearResetPasswordSuccess()
		clearResetPasswordSessionWarning()
	})

	const emailValue = () => getInput(form).email
	const codeValue = () => getInput(form).code ?? ""
	const trimmedEmailValue = () => emailValue()?.trim() ?? ""
	const emailSchemaMessages = () => ({
		required: t`Email is required`,
		invalid: t`Invalid email`,
	})
	const codeSchemaMessages = () => ({
		length: t`Verification code must be 6 digits`,
		invalid: t`Invalid verification code`,
	})
	const emailErrors = () =>
		getEmailErrors(trimmedEmailValue(), emailSchemaMessages())
	const codeErrors = () => getCodeErrors(codeValue(), codeSchemaMessages())
	const isEmailValid = () => emailErrors() === null
	const isCodeValid = () => codeErrors() === null
	const isVerifyStep = () =>
		uiStore.state.isSendingCode || uiStore.state.hasSentCode
	const isSubmitDisabled = () =>
		form.isSubmitting
		|| uiStore.state.isSendingCode
		|| uiStore.state.isVerifyingCode
		|| (!isVerifyStep() && !isEmailValid())
		|| (isVerifyStep() && !isCodeValid())
	const continueButtonType = () => (isVerifyStep() ? "submit" : "button")

	const handleEmailChange = () => {
		setErrors(form, {
			path: ["email"],
			errors: emailErrors(),
		})
	}

	const handleEmailKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Enter" || isVerifyStep()) return
		event.preventDefault()
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
		uiStore.setCooldown(seconds)

		if (cooldownTimer !== undefined) {
			clearCooldownTimer()
		}

		if (seconds <= 0) return

		const tickCooldown = uiStore.tickCooldown
		const isCoolingDown = uiStore.isCoolingDown
		cooldownTimer = globalThis.setInterval(() => {
			tickCooldown()
			if (!isCoolingDown() && cooldownTimer !== undefined) {
				clearCooldownTimer()
			}
		}, 1000)
	}

	const resetSendCodeFlow = () => {
		clearCooldownTimer()
		uiStore.resetSendCodeFlow()
		setInput(form, {
			input: {
				email: getInput(form).email ?? "",
				code: "",
			},
		})
	}

	const handleSendCode = async () => {
		if (uiStore.state.isSendingCode || uiStore.isCoolingDown()) return

		const email = trimmedEmailValue()
		if (email.length === 0) return
		saveResetPasswordEmail(email)

		await sendResetCode({
			email,
			forgotPassword: requestForgotPassword,
			startCooldown,
			uiStore,
			requestFailedMessage: t`Request failed`,
		})
	}

	const handleVerifyCode = async (values: VerifyResetCodeValues) => {
		const email = values.email.trim()

		await verifyResetCode({
			email,
			code: values.code,
			verifyResetCode: requestVerifyResetCode,
			requestFailedMessage: t`Request failed`,
			onSuccess: async (session) => {
				saveResetPasswordEmail(email)
				saveResetPasswordSession(session)
				await nav({ to: "/auth/reset-password" })
			},
			uiStore,
		})
	}

	const handleSubmit = async (values: VerifyResetCodeValues) => {
		if (isVerifyStep()) {
			await handleVerifyCode(values)
			return
		}

		await handleSendCode()
	}

	return (
		<>
			<header {...stylex.attrs(authStyles.header)}>
				<h1 {...stylex.attrs(authStyles.title)}>{t`Forgot password`}</h1>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				{...stylex.attrs(styles.form)}
			>
				<Show when={shouldShowSessionWarning}>
					<div {...stylex.attrs(styles.instructions)}>
						{t`Your reset session is no longer valid. Verify a new code to continue.`}
					</div>
				</Show>

				<Switch>
					<Match when={isVerifyStep() && isEmailValid()}>
						<>
							<VerifyStepHeader
								email={trimmedEmailValue()}
								isSendingCode={uiStore.state.isSendingCode}
								onChangeEmail={resetSendCodeFlow}
							/>
							<Field
								of={form}
								path={["code"]}
							>
								{(field) => (
									<>
										<div {...stylex.attrs(styles.codeRow)}>
											<div {...stylex.attrs(styles.codeField)}>
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
												disabled={
													form.isSubmitting
													|| uiStore.state.isSendingCode
													|| uiStore.isCoolingDown()
												}
												onClick={() => void handleSendCode()}
												appearance="outline"
												tone="gray"
												size="sm"
												styles={styles.resend}
											>
												{uiStore.state.isSendingCode
													? t`Sending...`
													: uiStore.isCoolingDown()
														? `Resend (${uiStore.state.cooldownSeconds}s)`
														: t`Resend code`}
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
									disabled={uiStore.state.isSendingCode}
									onChange={handleEmailChange}
									onKeyDown={handleEmailKeyDown}
								/>
							)}
						</Field>
					</Match>
				</Switch>

				<Show when={uiStore.state.verificationCodeExpiresMinutes !== undefined}>
					<div {...stylex.attrs(styles.resendStatus)}>
						Codes expire in {uiStore.state.verificationCodeExpiresMinutes}{" "}
						minutes.
					</div>
				</Show>

				<FormComp.ErrorMessage>
					{uiStore.state.sendCodeError}
				</FormComp.ErrorMessage>
				<FormComp.ErrorMessage>
					{uiStore.state.verifyCodeError}
				</FormComp.ErrorMessage>

				<Button
					type={continueButtonType()}
					disabled={isSubmitDisabled()}
					onClick={() => {
						if (!isVerifyStep()) void handleSendCode()
					}}
					appearance="solid"
					tone="reimu"
					size="sm"
					styles={styles.submit}
				>
					{t`Continue`}
				</Button>

				<div {...stylex.attrs(styles.signinPrompt)}>
					{t`Back to`}{" "}
					<Link
						to="/auth/sign-in"
						{...stylex.attrs(styles.signinLink)}
					>
						{t`sign in`}
					</Link>
					.
				</div>
			</Form>
		</>
	)
}

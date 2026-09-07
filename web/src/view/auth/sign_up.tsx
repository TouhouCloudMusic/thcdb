import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createSignal } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { SignUp as FormSchema } from "~/domain/auth/schema"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { EmailField } from "./component/EmailField"
import { PasswordField } from "./component/PasswordField"
import { UsernameField } from "./component/UsernameField"
import { authStyles } from "./styles"
import { setVerificationSession } from "./verify_email/session"
const styles = stylex.create({
	email: { marginTop: px[16] },
	password: { marginTop: px[16] },
	confirmation: { marginTop: px[16] },
	submit: { marginTop: px[24], height: px[36], width: "100%" },
	signinPrompt: {
		marginTop: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	signinLink: { textDecorationLine: "underline" },
})

export function SignUpPage() {
	const { t } = useLingui()
	const nav = useNavigate()
	const form = createForm({ schema: FormSchema })
	const [submitError, setSubmitError] = createSignal<string>()
	const handleSubmit = async (values: FormSchema) => {
		const result = await AuthApi.signup({
			body: {
				username: values.username,
				email: values.email,
				password: values.password,
			},
		})
		if (Either.isLeft(result)) {
			setSubmitError(result.left.error)
			return
		}
		setVerificationSession({
			requestStatus: "idle",
			email: values.email.trim(),
			resendAvailableAt:
				Date.now() + result.right.resend_cooldown_seconds * 1000,
		})
		await nav({ to: "/auth/verify-email" })
	}

	return (
		<>
			<header {...stylex.attrs(authStyles.header)}>
				<h1 {...stylex.attrs(authStyles.title)}>{t`Create account`}</h1>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				{...stylex.attrs(authStyles.form)}
			>
				<Field
					of={form}
					path={["username"]}
				>
					{(field) => <UsernameField field={field} />}
				</Field>

				<Field
					of={form}
					path={["email"]}
				>
					{(field) => (
						<EmailField
							field={field}
							styles={styles.email}
						/>
					)}
				</Field>

				<Field
					of={form}
					path={["password"]}
				>
					{(field) => (
						<PasswordField
							label={t`Password`}
							field={field}
							showRequirementHint
							styles={styles.password}
						/>
					)}
				</Field>

				<Field
					of={form}
					path={["repeated_password"]}
				>
					{(field) => (
						<PasswordField
							label={t`Repeat password`}
							field={field}
							styles={styles.confirmation}
						/>
					)}
				</Field>

				<FormComp.ErrorMessage>{submitError()}</FormComp.ErrorMessage>
				<Button
					type="submit"
					disabled={form.isSubmitting}
					appearance="solid"
					tone="reimu"
					size="sm"
					styles={styles.submit}
				>
					{t`Sign Up`}
				</Button>
			</Form>
			<p {...stylex.attrs(styles.signinPrompt)}>
				{t`Already have an account?`}{" "}
				<Link
					to="/auth/sign-in"
					class={stylex.attrs(link.base, link.text, styles.signinLink).class}
				>{t`Sign in`}</Link>
			</p>
		</>
	)
}

import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createSignal } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { SignIn as FormSchema } from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { SignInIdentifierField } from "./component/SignInIdentifierField"
import { authStyles } from "./styles"
import { setVerificationSession } from "./verify_email/session"
const styles = stylex.create({
	passwordField: { marginTop: px[16] },
	passwordHeading: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
		gap: px[16],
	},
	forgotPassword: {
		color: colors.textSecondary,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	submit: { marginTop: px[24], height: px[36], width: "100%" },
	signupPrompt: {
		marginTop: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	signupLink: { textDecorationLine: "underline" },
})

export function SignInPage() {
	const { t } = useLingui()
	const nav = useNavigate()
	const form = createForm({ schema: FormSchema })
	const [submitError, setSubmitError] = createSignal<string>()
	const userCtx = useCurrentUser()
	const handleSubmit = async (values: FormSchema) => {
		await userCtx.run(async () => {
			const result = await AuthApi.signin({
				body: { username: values.identifier, password: values.password },
			})
			if (Either.isLeft(result)) {
				setSubmitError(result.left.error)
				throw result.left
			}
		})
		setVerificationSession(undefined)
		await nav({ to: "/" })
	}

	return (
		<>
			<header {...stylex.attrs(authStyles.header)}>
				<h1 {...stylex.attrs(authStyles.title)}>{t`Sign in`}</h1>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				{...stylex.attrs(authStyles.form)}
			>
				<Field
					of={form}
					path={["identifier"]}
				>
					{(field) => <SignInIdentifierField field={field} />}
				</Field>

				<Field
					of={form}
					path={["password"]}
				>
					{(field) => (
						<InputField.Root styles={styles.passwordField}>
							<div {...stylex.attrs(styles.passwordHeading)}>
								<InputField.Label
									styles={authStyles.fieldLabel}
								>{t`Password`}</InputField.Label>
								<Link
									to="/auth/forgot-password"
									class={
										stylex.attrs(link.base, link.text, styles.forgotPassword)
											.class
									}
								>{t`Forgot password?`}</Link>
							</div>
							<InputField.Input
								{...field.props}
								id={field.path.join(".")}
								type="password"
								value={field.input ?? ""}
								styles={authStyles.input}
							/>
							<InputField.Error>{field.errors?.[0]}</InputField.Error>
						</InputField.Root>
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
					{t`Sign In`}
				</Button>
			</Form>
			<p {...stylex.attrs(styles.signupPrompt)}>
				{t`Don't have an account?`}{" "}
				<Link
					to="/auth/sign-up"
					class={stylex.attrs(link.base, link.text, styles.signupLink).class}
				>{t`Sign Up`}</Link>
			</p>
		</>
	)
}

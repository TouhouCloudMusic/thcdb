import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createSignal } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { SignUp as FormSchema } from "~/domain/auth/schema"

import { EmailField } from "./component/EmailField"
import { PasswordField } from "./component/PasswordField"
import { UsernameField } from "./component/UsernameField"
import { AUTH_HEADER_CLASS, AUTH_TITLE_CLASS, AUTH_FORM_CLASS } from "./styles"
import { setVerificationSession } from "./verify_email/session"
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
			<header class={AUTH_HEADER_CLASS}>
				<h1 class={AUTH_TITLE_CLASS}>{t`Create account`}</h1>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				class={AUTH_FORM_CLASS}
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
							class="mt-4"
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
							class="mt-4"
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
							class="mt-4"
						/>
					)}
				</Field>

				<FormComp.ErrorMessage>{submitError()}</FormComp.ErrorMessage>
				<Button
					type="submit"
					variant="Primary"
					color="Reimu"
					size="Sm"
					class="mt-6 h-9 w-full"
					disabled={form.isSubmitting}
				>
					{t`Sign Up`}
				</Button>
			</Form>
			<p class="mt-4 text-sm text-secondary">
				{t`Already have an account?`}{" "}
				<Link
					to="/auth/sign-in"
					class="underline"
				>{t`Sign in`}</Link>
			</p>
		</>
	)
}

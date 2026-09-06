import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createSignal } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { SignIn as FormSchema } from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"

import { SignInIdentifierField } from "./component/SignInIdentifierField"
import {
	AUTH_HEADER_CLASS,
	AUTH_TITLE_CLASS,
	AUTH_FORM_CLASS,
	AUTH_FIELD_LABEL_CLASS,
	AUTH_INPUT_CLASS,
} from "./styles"
import { setVerificationSession } from "./verify_email/session"
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
			<header class={AUTH_HEADER_CLASS}>
				<h1 class={AUTH_TITLE_CLASS}>{t`Sign in`}</h1>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				class={AUTH_FORM_CLASS}
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
						<InputField.Root class="mt-4">
							<div class="flex items-baseline justify-between gap-4">
								<InputField.Label
									class={AUTH_FIELD_LABEL_CLASS}
								>{t`Password`}</InputField.Label>
								<Link
									to="/auth/forgot-password"
									class="text-secondary text-sm"
								>{t`Forgot password?`}</Link>
							</div>
							<InputField.Input
								{...field.props}
								id={field.path.join(".")}
								type="password"
								value={field.input ?? ""}
								class={AUTH_INPUT_CLASS}
							/>
							<InputField.Error>{field.errors?.[0]}</InputField.Error>
						</InputField.Root>
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
					{t`Sign In`}
				</Button>
			</Form>
			<p class="mt-4 text-sm text-secondary">
				{t`Don't have an account?`}{" "}
				<Link
					to="/auth/sign-up"
					class="underline"
				>{t`Sign Up`}</Link>
			</p>
		</>
	)
}

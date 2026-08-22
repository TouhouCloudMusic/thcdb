import { Field, Form } from "@formisch/solid"
import { Tabs } from "@kobalte/core/tabs"
import { useLingui } from "@lingui/solid/macro"
import { For, Show } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"

import type { AuthFormMode, useAuthForm } from "../useAuthForm"
import { EmailField } from "./EmailField"
import { PasswordField } from "./PasswordField"
import { SignInIdentifierField } from "./SignInIdentifierField"
import { UsernameField } from "./UsernameField"

type AuthFormState = ReturnType<typeof useAuthForm>
type AuthCredentialFormProps = Pick<
	AuthFormState,
	| "mode"
	| "setMode"
	| "signInForm"
	| "signUpForm"
	| "submitError"
	| "handleSignIn"
	| "handleSignUp"
>

const isAuthFormMode = (value: string): value is AuthFormMode =>
	value === "sign_in" || value === "sign_up"

const FORM_STYLE = "w-full flex flex-col"
const AUTH_TAB_ITEMS = [
	{
		value: "sign_in" as const,
	},
	{
		value: "sign_up" as const,
	},
]

export function AuthCredentialForm(props: AuthCredentialFormProps) {
	const { t } = useLingui()
	const isSignIn = () => props.mode() === "sign_in"

	return (
		<>
			<Tabs
				value={props.mode()}
				onChange={(value) => {
					if (!isAuthFormMode(value)) return
					props.setMode(value)
				}}
				class="mb-6"
			>
				<Tabs.List class="relative grid grid-cols-2 rounded-lg bg-secondary p-1.5 ring-1 ring-slate-200">
					<For each={AUTH_TAB_ITEMS}>
						{(item) => (
							<Tabs.Trigger
								value={item.value}
								class="relative z-10 rounded-md px-4 py-2.5 text-sm  text-tertiary outline-none transition-colors duration-150 focus-visible:outline focus-visible:outline-reimu-600 data-selected:text-primary"
							>
								<AuthTabLabel value={item.value} />
							</Tabs.Trigger>
						)}
					</For>
					<Tabs.Indicator class="absolute inset-y-1.5 rounded-md bg-primary shadow-xs ring-1 ring-slate-200 transition-all duration-200" />
				</Tabs.List>
			</Tabs>

			<Show
				when={isSignIn()}
				fallback={
					<Form
						of={props.signUpForm}
						onSubmit={props.handleSignUp}
						class={FORM_STYLE}
					>
						<Field
							of={props.signUpForm}
							path={["username"]}
						>
							{(field) => <UsernameField field={field} />}
						</Field>

						<Field
							of={props.signUpForm}
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
							of={props.signUpForm}
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
							of={props.signUpForm}
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

						<FormComp.ErrorMessage>{props.submitError()}</FormComp.ErrorMessage>
						<Button
							type="submit"
							variant="Primary"
							color="Reimu"
							size="Sm"
							class="mt-6 h-9 w-full"
							disabled={props.signUpForm.isSubmitting}
						>
							{t`Sign Up`}
						</Button>
					</Form>
				}
			>
				<Form
					of={props.signInForm}
					onSubmit={props.handleSignIn}
					class={FORM_STYLE}
				>
					<Field
						of={props.signInForm}
						path={["identifier"]}
					>
						{(field) => <SignInIdentifierField field={field} />}
					</Field>

					<Field
						of={props.signInForm}
						path={["password"]}
					>
						{(field) => (
							<PasswordField
								label={t`Password`}
								field={field}
								class="mt-4"
							/>
						)}
					</Field>

					<Link
						to="/auth/forgot-password"
						class="text-secondary text-sm self-end mt-4"
					>
						{t`Forgot password?`}
					</Link>

					<FormComp.ErrorMessage>{props.submitError()}</FormComp.ErrorMessage>
					<Button
						type="submit"
						variant="Primary"
						color="Reimu"
						size="Sm"
						class="mt-6 h-9 w-full"
						disabled={props.signInForm.isSubmitting}
					>
						{t`Sign In`}
					</Button>
				</Form>
			</Show>
		</>
	)
}

function AuthTabLabel(props: { value: Exclude<AuthFormMode, "verify_email"> }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.value) {
			case "sign_in": {
				return t`Sign In`
			}
			case "sign_up": {
				return t`Sign Up`
			}
		}
	}

	return <>{label()}</>
}

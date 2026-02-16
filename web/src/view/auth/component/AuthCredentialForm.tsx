import { Field, Form } from "@formisch/solid"
import { Tabs } from "@kobalte/core/tabs"
import { For, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"

import type { AuthFormMode, useAuthForm } from "../store"
import { EmailField, PasswordField, UserNameField } from "./Field"

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

const getTabsValue = (mode: AuthFormMode) =>
	mode === "sign_up" ? "sign_up" : "sign_in"

export function AuthCredentialForm(props: AuthCredentialFormProps) {
	return (
		<>
			<Tabs
				value={getTabsValue(props.mode())}
				onChange={(value) => {
					if (!isAuthFormMode(value)) return
					props.setMode(value)
				}}
				class="mb-6"
			>
				<Tabs.List class="relative grid grid-cols-2 rounded-lg bg-secondary p-1.5 ring-1 ring-slate-200">
					<For each={["Sign In", "Sign Up"]}>
						{(value) => (
							<Tabs.Trigger
								value={value == "Sign In" ? "sign_in" : "sign_up"}
								class="relative z-10 rounded-md px-4 py-2.5 text-sm  text-tertiary outline-none transition-colors duration-150 focus-visible:outline focus-visible:outline-reimu-600 data-selected:text-primary"
							>
								{value}
							</Tabs.Trigger>
						)}
					</For>
					<Tabs.Indicator class="absolute inset-y-1.5 rounded-md bg-primary shadow-xs ring-1 ring-slate-200 transition-all duration-200" />
				</Tabs.List>
			</Tabs>

			<Show
				when={props.mode() === "sign_in"}
				fallback={
					<Form
						of={props.signUpForm}
						onSubmit={props.handleSignUp}
						class="w-full space-y-6"
					>
						<Field
							of={props.signUpForm}
							path={["username"]}
						>
							{(field) => <UserNameField field={field} />}
						</Field>
						<Field
							of={props.signUpForm}
							path={["email"]}
						>
							{(field) => <EmailField field={field} />}
						</Field>
						<Field
							of={props.signUpForm}
							path={["password"]}
						>
							{(field) => (
								<PasswordField
									label="Password"
									field={field}
									showRequirementHint
								/>
							)}
						</Field>
						<Field
							of={props.signUpForm}
							path={["repeated_password"]}
						>
							{(field) => (
								<PasswordField
									label="Repeat password"
									field={field}
								/>
							)}
						</Field>

						<FormComp.ErrorMessage>{props.submitError()}</FormComp.ErrorMessage>

						<Button
							type="submit"
							variant="Primary"
							color="Reimu"
							size="Sm"
							class="mt-1 h-9 w-full"
							disabled={props.signUpForm.isSubmitting}
						>
							Sign Up
						</Button>
					</Form>
				}
			>
				<Form
					of={props.signInForm}
					onSubmit={props.handleSignIn}
					class="w-full space-y-6"
				>
					<Field
						of={props.signInForm}
						path={["username"]}
					>
						{(field) => <UserNameField field={field} />}
					</Field>
					<Field
						of={props.signInForm}
						path={["password"]}
					>
						{(field) => (
							<PasswordField
								label="Password"
								field={field}
							/>
						)}
					</Field>

					<FormComp.ErrorMessage>{props.submitError()}</FormComp.ErrorMessage>

					<Button
						type="submit"
						variant="Primary"
						color="Reimu"
						size="Sm"
						class="mt-1 h-9 w-full"
						disabled={props.signInForm.isSubmitting}
					>
						Sign In
					</Button>
				</Form>
			</Show>
		</>
	)
}

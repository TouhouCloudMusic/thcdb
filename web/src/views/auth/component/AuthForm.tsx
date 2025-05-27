import { Tabs } from "@kobalte/core/tabs"
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { Field, Form } from "@modular-forms/solid"
import type { FormStore } from "@modular-forms/solid"
import { Show } from "solid-js"

import type { AuthSchema } from "~/api"
import { Button } from "~/components/button"
import { FormComp } from "~/components/common/form"

import type { AuthFormMode } from "../store"
import { useAuthForm } from "../store"
import { UserNameField, PasswordField } from "./Field"

export function AuthForm() {
	const { mode, setMode, formStore, handleSubmit } = useAuthForm()

	const { t } = useLingui()
	return (
		<div class="flex h-[calc(100vh-16rem)] items-center justify-center">
			<div class="bg-whit flex w-96 flex-col rounded-2xl p-8 shadow-md">
				<Tabs
					class="mb-6 h-12"
					defaultValue={mode()}
					onChange={(value) => {
						setMode(value as AuthFormMode)
					}}
				>
					<Tabs.List class="relative grid grid-cols-2">
						<Tabs.Trigger
							as={Button}
							value="sign_in"
							variant="Tertiary"
							class="rounded-r-none py-2"
						>
							<Trans>Sign In</Trans>
						</Tabs.Trigger>
						<Tabs.Trigger
							as={Button}
							value="sign_up"
							variant="Tertiary"
							class="rounded-l-none py-2"
						>
							<Trans>Sign Up</Trans>
						</Tabs.Trigger>
						<Tabs.Indicator class="absolute bottom-0 h-[2px] bg-reimu-600 transition-all duration-200" />
					</Tabs.List>
				</Tabs>
				<Form
					of={formStore() as FormStore<AuthSchema.SignIn>}
					datatype="application/json"
					onSubmit={handleSubmit}
					class="w-full space-y-8"
				>
					<Field
						of={formStore() as FormStore<AuthSchema.SignIn>}
						name="username"
					>
						{(field, props) => (
							<UserNameField
								field={field}
								props={props}
							/>
						)}
					</Field>
					<Field
						of={formStore() as FormStore<AuthSchema.SignIn>}
						name="password"
					>
						{(field, props) => (
							<PasswordField
								label={t`Password`}
								field={field}
								props={props}
							/>
						)}
					</Field>

					<Show when={mode() === "sign_up"}>
						<Field
							of={formStore() as FormStore<AuthSchema.SignUp>}
							name="repeated_password"
						>
							{(field, props) => (
								<PasswordField
									label={t`Repeated Password`}
									field={field}
									props={props}
								/>
							)}
						</Field>
					</Show>

					{/* TODO: Rememeber me */}

					<FormComp.ErrorMessage message={formStore().response.message} />

					<Button
						type="submit"
						variant="Primary"
						color="Reimu"
						class="mt-2 w-full shadow-lg"
					>
						{mode() == "sign_in" ? t`Sign In` : t`Sign Up`}
					</Button>
				</Form>
			</div>
		</div>
	)
}

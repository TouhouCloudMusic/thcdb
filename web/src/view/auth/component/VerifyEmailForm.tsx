import { Field, Form } from "@formisch/solid"
import { Show } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"

import type { useAuthForm } from "../store"
import { VerificationCodeField } from "./VerificationCodeField"

type AuthFormState = ReturnType<typeof useAuthForm>
type VerifyEmailFormProps = Pick<
	AuthFormState,
	| "verifyEmailForm"
	| "resendCooldownSeconds"
	| "isResendingVerificationEmail"
	| "verificationEmail"
	| "submitError"
	| "submitInfo"
	| "handleVerifyEmail"
	| "handleResendVerificationEmail"
>

export function VerifyEmailForm(props: VerifyEmailFormProps) {
	return (
		<Form
			of={props.verifyEmailForm}
			onSubmit={props.handleVerifyEmail}
			class="w-full space-y-6"
		>
			<Show when={props.verificationEmail()}>
				<div class="text-sm text-secondary">
					Enter the code for {props.verificationEmail()}. If you did not receive
					one, use Resend.
				</div>
			</Show>

			<Field
				of={props.verifyEmailForm}
				path={["code"]}
			>
				{(field) => <VerificationCodeField field={field} />}
			</Field>

			<FormComp.ErrorMessage>{props.submitError()}</FormComp.ErrorMessage>
			<Show when={props.submitInfo()}>
				<div class="mt-2 text-sm text-secondary">{props.submitInfo()}</div>
			</Show>

			<div class="flex gap-2">
				<Button
					type="submit"
					variant="Primary"
					color="Reimu"
					size="Sm"
					class="h-9 w-full"
					disabled={props.verifyEmailForm.isSubmitting}
				>
					Verify Email
				</Button>
				<Button
					type="button"
					variant="Secondary"
					size="Sm"
					class="h-9"
					onClick={() => {
						void props.handleResendVerificationEmail()
					}}
					disabled={
						props.verifyEmailForm.isSubmitting
						|| props.isResendingVerificationEmail()
						|| props.resendCooldownSeconds() > 0
					}
				>
					{props.resendCooldownSeconds() > 0
						? `Resend (${props.resendCooldownSeconds()}s)`
						: "Resend"}
				</Button>
			</div>

			<div class="text-sm text-tertiary">
				Already have an account?{" "}
				<Link
					to="/auth"
					search={{ type: "sign_in" }}
					class="text-secondary underline underline-offset-2"
				>
					Sign in
				</Link>
			</div>
		</Form>
	)
}

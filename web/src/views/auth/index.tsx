import {
	type FieldElementProps,
	type FieldStore,
	FormError,
	valiForm,
	Form,
	Field,
	createFormStore,
	type SubmitHandler,
	type FormStore,
} from "@modular-forms/solid"
import { getRouteApi, Navigate, useNavigate } from "@tanstack/solid-router"
import {
	createEffect,
	createMemo,
	createSignal,
	Show,
	type ParentProps,
} from "solid-js"
import * as v from "valibot"
import { FetchClient } from "~/api"
import { Button } from "~/components/button"
import { Divider } from "~/components/divider"
import { Input } from "~/components/input"
import { useUserCtx } from "~/state/user"

const SignInForm = v.object({
	username: v.string(),
	password: v.string(),
})
type SignInForm = v.InferInput<typeof SignInForm>

const SignUpFrom = v.pipe(
	v.object({
		username: v.string(),
		password: v.string(),
		repeated_password: v.string(),
	}),
	v.forward(
		v.partialCheck(
			[["password"], ["repeated_password"]],
			(input) => input.password === input.repeated_password,
			"Password mismatch",
		),
		["repeated_password"],
	),
)
type SignUpForm = v.InferInput<typeof SignUpFrom>

export function Auth() {
	return (
		<Guard>
			<FormComp />
		</Guard>
	)
}

function Guard(props: ParentProps) {
	return (
		<Show
			when={!useUserCtx().is_signed_in}
			fallback={<Navigate to="/" />}
		>
			{props.children}
		</Show>
	)
}

const RouteApi = getRouteApi("/auth")

function FormComp() {
	type Mode = "sign_in" | "sign_up"

	let search_params = RouteApi.useSearch()

	let [mode, setMode] = createSignal<Mode>(search_params().type)

	const form_store = createMemo(() => {
		if (mode() == "sign_in") {
			// @ts-ignore
			return createFormStore<SignInForm>({
				validate: valiForm(SignInForm),
			})
		} else {
			// @ts-ignore
			return createFormStore<SignUpForm>({
				validate: valiForm(SignUpFrom),
			})
		}
	})

	createEffect(() => {
		setMode(search_params().type)
	})

	let user_ctx = useUserCtx()
	let nav = useNavigate()

	let handle_submit: SubmitHandler<SignInForm> = async (values, _) => {
		let { data, error } =
			mode() === "sign_in" ?
				await FetchClient.POST("/sign_in", {
					body: {
						username: values.username,
						password: values.password,
					},
				})
			:	await FetchClient.POST("/sign_up", {
					body: {
						username: values.username,
						password: values.password,
					},
				})

		if (error) {
			throw new FormError<SignInForm>(error.message)
		}

		if (data) {
			user_ctx.sign_in({
				user: data.data,
			})
			return nav({ to: "/" })
		}
	}
	return (
		<Form
			of={form_store() as FormStore<SignInForm>}
			datatype="application/json"
			onSubmit={handle_submit}
			class="mx-auto mt-32 flex w-1/3 flex-col gap-4 rounded border-1 border-slate-100 p-8 shadow-lg"
		>
			<div class="mb-2 grid grid-cols-2 gap-2">
				<Button
					variant={mode() === "sign_in" ? "Primary" : "Tertiary"}
					onClick={() => setMode("sign_in")}
				>
					Sign In
				</Button>
				<Button
					variant={mode() === "sign_up" ? "Primary" : "Tertiary"}
					onClick={() => setMode("sign_up")}
				>
					Sign Up
				</Button>
			</div>
			<Divider
				horizonal
				class="bg-slate-300"
			/>
			<Field
				of={form_store() as FormStore<SignInForm>}
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
				of={form_store() as FormStore<SignInForm>}
				name="password"
			>
				{(field, props) => (
					<PasswordField
						name="password"
						label="Password"
						field={field}
						props={props}
					/>
				)}
			</Field>
			<Show when={mode() === "sign_up"}>
				<Field
					of={form_store() as FormStore<SignUpForm>}
					name="repeated_password"
				>
					{(field, props) => {
						createEffect(() => {
							console.log(field.error)
						})
						return (
							<PasswordField
								name="repeated_password"
								label="Repeat Password"
								field={field}
								props={props}
							/>
						)
					}}
				</Field>
			</Show>
			<FieldError>{form_store().response.message}</FieldError>
			<Divider
				horizonal
				class="bg-slate-300"
			/>
			<Button
				type="submit"
				variant="Primary"
				color="Reimu"
				class="mt-4"
			>
				{mode() === "sign_in" ? "Sign In" : "Sign Up"}
			</Button>
		</Form>
	)
}

function FieldLayout(
	props: ParentProps<{
		label: string
		for: string
		error?: string
	}>,
) {
	return (
		<div class="flex flex-col gap-2">
			<label for={props.for}>{props.label}</label>
			{props.children}
			{props.error && <FieldError>{props.error}</FieldError>}
		</div>
	)
}

function FieldError(props: ParentProps) {
	return <span class="text-sm text-reimu-700">{props.children}</span>
}

function UserNameField(props: {
	field: FieldStore<SignInForm, "username">
	props: FieldElementProps<SignInForm, "username">
}) {
	return (
		<FieldLayout
			label="Username"
			for="username"
			error={props.field.error}
		>
			<Input
				{...props.props}
				type="text"
				id="username"
			/>
		</FieldLayout>
	)
}

function PasswordField<T extends "password" | "repeated_password">(props: {
	name: T
	label: string
	field: T extends "password" ? FieldStore<SignInForm, T>
	:	FieldStore<SignUpForm, T>
	props: FieldElementProps<SignUpForm, T>
}) {
	return (
		<FieldLayout
			label={props.label}
			for={props.name}
			error={props.field.error}
		>
			<Input
				{...props.props}
				type="password"
				id={props.name}
			/>
		</FieldLayout>
	)
}

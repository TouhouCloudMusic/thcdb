import type { FieldStore } from "@formisch/solid"
import type { JSX, ParentProps } from "solid-js"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import { CheckIcon, Cross1Icon } from "solid-radix-icons"

import { InputField } from "~/component/atomic/form/Input"
import {
	USER_PASSWORD_MAX_LENGTH,
	USER_PASSWORD_MIN_LENGTH,
	USER_PASSWORD_REGEX_STR,
} from "~/constant/server"
import type * as AuthSchema from "~/domain/auth/schema"

type SignInSchema = typeof AuthSchema.SignIn
type SignUpSchema = typeof AuthSchema.SignUp

type UserNameFieldStore =
	| FieldStore<SignInSchema, ["username"]>
	| FieldStore<SignUpSchema, ["username"]>
type PasswordFieldStore =
	| FieldStore<SignInSchema, ["password"]>
	| FieldStore<SignUpSchema, ["password"]>
	| FieldStore<SignUpSchema, ["repeated_password"]>

export function FieldLayout(
	props: ParentProps<{
		label: string
		for: string
		error?: string
		hint?: JSX.Element
	}>,
) {
	return (
		<InputField.Root>
			<InputField.Label class="text-sm text-tertiary">
				{props.label}
			</InputField.Label>
			{props.children}
			<Show when={props.hint}>
				<div class="mt-2">{props.hint}</div>
			</Show>
			<InputField.Error>{props.error}</InputField.Error>
		</InputField.Root>
	)
}

const WHITESPACE_REGEX = /\s/
const hasWhitespaceOrControl = (input: string) => {
	for (const char of input) {
		if (WHITESPACE_REGEX.test(char)) return true
		const code = char.codePointAt(0)
		if (code === undefined) continue
		if (code <= 31 || code === 127) return true
	}
	return false
}
const PASSWORD_ALLOWED_CHARS_REGEX = new RegExp(
	USER_PASSWORD_REGEX_STR.replace(/\{\d+,\d+\}/, "*"),
)
const PASSWORD_ALLOWED_SYMBOLS = (() => {
	const m = USER_PASSWORD_REGEX_STR.match(/^\^\[([^\]]+)\]/)
	if (!m) return "`~!@#$%^&*()-_=+"
	const charset = m[1]
	if (!charset) return "`~!@#$%^&*()-_=+"
	return charset
		.replace("A-Za-z", "")
		.replace(String.raw`\d`, "")
		.replaceAll("\\", "")
})()

export function PasswordField(props: {
	label: string
	field: PasswordFieldStore
	showRequirementHint?: boolean
	hintText?: string
}) {
	const [requirementsOpen, setRequirementsOpen] = createSignal(false)
	const id = () => props.field.path.join(".")

	const value = createMemo(() => props.field.input ?? "")
	const active = createMemo(() => value().length > 0)
	const showRequirementCard = createMemo(
		() => (props.showRequirementHint ?? false) && requirementsOpen(),
	)

	const lengthOk = createMemo(() => {
		const v = value()
		return (
			v.length >= USER_PASSWORD_MIN_LENGTH
			&& v.length <= USER_PASSWORD_MAX_LENGTH
		)
	})

	const noWhitespaceOk = createMemo(() => !hasWhitespaceOrControl(value()))
	const allowedCharsOk = createMemo(() =>
		PASSWORD_ALLOWED_CHARS_REGEX.test(value()),
	)

	const RequirementRow = (rowProps: { ok: boolean; children: JSX.Element }) => {
		const state = () => {
			if (!active()) return "idle"
			return rowProps.ok ? "ok" : "bad"
		}

		const iconWrapClass = () => {
			if (state() === "ok")
				return "bg-green-100 text-green-700 ring-1 ring-green-200"
			if (state() === "bad")
				return "bg-reimu-100 text-reimu-700 ring-1 ring-reimu-200"
			return "bg-secondary text-tertiary ring-1 ring-slate-300"
		}

		return (
			<li class="flex gap-2">
				<span
					class={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${iconWrapClass()}`}
				>
					<Switch>
						<Match when={state() === "ok"}>
							<CheckIcon class="size-3" />
						</Match>
						<Match when={state() === "bad"}>
							<Cross1Icon class="size-3" />
						</Match>
						<Match when={state() === "idle"}>
							<span class="block size-1.5 rounded-full bg-current"></span>
						</Match>
					</Switch>
				</span>
				<div class="text-primary">{rowProps.children}</div>
			</li>
		)
	}

	const hintTextElement = createMemo(() => {
		if (!props.hintText) return
		return (
			<div class="text-xs leading-relaxed text-tertiary">{props.hintText}</div>
		)
	})

	return (
		<FieldLayout
			label={props.label}
			for={id()}
			error={props.field.errors?.[0]}
			hint={hintTextElement()}
		>
			<div class="relative">
				<InputField.Input
					{...props.field.props}
					class="h-9 w-full"
					type="password"
					id={id()}
					value={props.field.input ?? ""}
					onFocus={() => {
						setRequirementsOpen(true)
					}}
					onBlur={(e) => {
						props.field.props.onBlur?.(e)
						setRequirementsOpen(false)
					}}
				/>

				<Show when={showRequirementCard()}>
					<div class="pointer-events-none absolute left-0 top-full z-20 mt-2 w-full rounded-lg border border-slate-200 bg-primary/90 px-3 py-2 shadow-md backdrop-blur-sm">
						<div class="mb-1 text-[11px] font-medium  text-secondary">
							PASSWORD REQUIREMENTS
						</div>
						<ul class="space-y-1 text-xs">
							<RequirementRow ok={lengthOk()}>
								<span>
									{USER_PASSWORD_MIN_LENGTH}-{USER_PASSWORD_MAX_LENGTH}
									characters
								</span>
							</RequirementRow>
							<RequirementRow ok={noWhitespaceOk()}>
								<span>No spaces or control characters</span>
							</RequirementRow>
							<RequirementRow ok={allowedCharsOk()}>
								<span>
									Allowed: A-Z, a-z, 0-9,{" "}
									<code class="rounded bg-primary px-1 font-mono text-[11px] text-secondary ring-1 ring-slate-200">
										{PASSWORD_ALLOWED_SYMBOLS}
									</code>
								</span>
							</RequirementRow>
						</ul>
					</div>
				</Show>
			</div>
		</FieldLayout>
	)
}

export function UserNameField(props: { field: UserNameFieldStore }) {
	return (
		<FieldLayout
			label="Username"
			for="username"
			error={props.field.errors?.[0]}
		>
			<InputField.Input
				{...props.field.props}
				class="h-9 w-full"
				type="text"
				id="username"
				value={props.field.input ?? ""}
			/>
		</FieldLayout>
	)
}

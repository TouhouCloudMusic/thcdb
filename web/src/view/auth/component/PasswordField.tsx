import type { FieldElementProps } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { CheckIcon, Cross1Icon } from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import {
	USER_PASSWORD_MAX_LENGTH,
	USER_PASSWORD_MIN_LENGTH,
	USER_PASSWORD_REGEX_STR,
} from "~/constant/server"
import { isPasswordStrongEnough } from "~/domain/auth/password_strength"
import { callHandlerUnion } from "~/utils/dom/event"

import { FieldLayout } from "./FieldLayout"

const WHITESPACE_REGEX = /\s/u
const PASSWORD_ALLOWED_CHARS_REGEX = new RegExp(
	USER_PASSWORD_REGEX_STR.replace(/\{\d+,\d+\}/u, "*"),
	"u",
)
const PASSWORD_ALLOWED_SYMBOLS = (() => {
	const m = /^\^\[([^\]]+)\]/u.exec(USER_PASSWORD_REGEX_STR)
	if (!m) return "`~!@#$%^&*()-_=+"

	const charset = m[1]
	if (!charset) return "`~!@#$%^&*()-_=+"

	return charset
		.replace("A-Za-z", "")
		.replace(String.raw`\d`, "")
		.replaceAll("\\", "")
})()

type PasswordFieldStore = {
	errors: [string, ...string[]] | null
	input: string | undefined
	path: readonly (string | number)[]
	props: FieldElementProps
}

type PasswordFieldProps = {
	label: string
	field: PasswordFieldStore
	showRequirementHint?: boolean
	hintText?: string
	class?: string
}

function hasWhitespaceOrControl(input: string) {
	for (const char of input) {
		if (WHITESPACE_REGEX.test(char)) return true

		const code = char.codePointAt(0)
		if (code === undefined) continue
		if (code <= 31 || code === 127) return true
	}
	return false
}

export function PasswordField(props: PasswordFieldProps) {
	const { t } = useLingui()
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
	const strengthOk = createMemo(() => {
		if (!active()) return false
		return isPasswordStrongEnough(value())
	})

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
		return props.hintText ? (
			<div class="text-xs leading-relaxed text-tertiary">{props.hintText}</div>
		) : undefined
	})

	return (
		<FieldLayout
			label={props.label}
			error={props.field.errors?.[0]}
			hint={hintTextElement()}
			class={props.class}
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
						callHandlerUnion(e, props.field.props.onBlur)
						setRequirementsOpen(false)
					}}
				/>

				<Show when={showRequirementCard()}>
					<div class="pointer-events-none absolute left-0 top-full z-20 mt-2 w-full rounded-lg border border-slate-200 bg-primary/90 px-3 py-2 shadow-md backdrop-blur-sm">
						<div class="mb-1 text-xs font-medium text-secondary">
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
								<span>{t`No spaces or control characters`}</span>
							</RequirementRow>
							<RequirementRow ok={allowedCharsOk()}>
								<span>
									Allowed: A-Z, a-z, 0-9,{" "}
									<code class="rounded bg-primary px-1 font-mono text-xs text-secondary ring-1 ring-slate-200">
										{PASSWORD_ALLOWED_SYMBOLS}
									</code>
								</span>
							</RequirementRow>
							<RequirementRow ok={strengthOk()}>
								<span>{t`Strong enough`}</span>
							</RequirementRow>
						</ul>
					</div>
				</Show>
			</div>
		</FieldLayout>
	)
}

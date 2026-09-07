import type { FieldElementProps } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
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
import { palette } from "~/style/color/palette.stylex"
import {
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
	radius,
} from "~/style/tokens.stylex"
import { callHandlerUnion } from "~/utils/dom/event"

import { authStyles } from "../styles"
import { FieldLayout } from "./FieldLayout"

const styles = stylex.create({
	requirement: {
		display: "flex",
		gap: px[8],
		marginBlockEnd: { default: 0, ":not(:last-child)": px[4] },
	},
	checkIcon: { width: px[12], height: px[12] },
	crossIcon: { width: px[12], height: px[12] },
	idleDot: {
		display: "block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
		backgroundColor: "currentColor",
	},
	requirementText: { color: colors.textPrimary },
	hint: {
		fontSize: fontSizes.xs,
		lineHeight: 1.625,
		color: colors.textTertiary,
	},
	inputContainer: { position: "relative" },
	requirementsPopover: {
		pointerEvents: "none",
		position: "absolute",
		left: "0rem",
		top: "100%",
		zIndex: 20,
		marginTop: px[8],
		width: "100%",
		borderRadius: radius.lg,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: `color-mix(in oklab, ${colors.backgroundPrimary} 90%, transparent)`,
		paddingInline: px[12],
		paddingBlock: px[8],
		boxShadow:
			"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
		backdropFilter: "blur(8px)",
	},
	requirementsHeading: {
		marginBottom: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: colors.textSecondary,
	},
	requirementsList: { fontSize: fontSizes.xs, lineHeight: "1rem" },
	allowedSymbols: {
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundPrimary,
		paddingInline: px[4],
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textSecondary,
		boxShadow: `0 0 0 1px ${palette.slate[200]}`,
	},
})

const requirementStyles = stylex.create({
	icon: {
		marginTop: px[2],
		display: "grid",
		width: px[16],
		height: px[16],
		flexShrink: 0,
		placeItems: "center",
		borderRadius: radius.full,
	},
	valid: {
		backgroundColor: palette.green[100],
		color: palette.green[700],
		boxShadow: `0 0 0 1px ${palette.green[200]}`,
	},
	invalid: {
		backgroundColor: palette.reimu[100],
		color: palette.reimu[700],
		boxShadow: `0 0 0 1px ${palette.reimu[200]}`,
	},
	idle: {
		backgroundColor: colors.backgroundSecondary,
		color: colors.textTertiary,
		boxShadow: `0 0 0 1px ${palette.slate[300]}`,
	},
})
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
	styles?: StyleXStyles
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

		const iconStyles = () => {
			if (state() === "ok") return requirementStyles.valid
			if (state() === "bad") return requirementStyles.invalid
			return requirementStyles.idle
		}

		return (
			<li {...stylex.attrs(styles.requirement)}>
				<span {...stylex.attrs(requirementStyles.icon, iconStyles())}>
					<Switch>
						<Match when={state() === "ok"}>
							<CheckIcon {...stylex.attrs(styles.checkIcon)} />
						</Match>
						<Match when={state() === "bad"}>
							<Cross1Icon {...stylex.attrs(styles.crossIcon)} />
						</Match>
						<Match when={state() === "idle"}>
							<span {...stylex.attrs(styles.idleDot)}></span>
						</Match>
					</Switch>
				</span>
				<div {...stylex.attrs(styles.requirementText)}>{rowProps.children}</div>
			</li>
		)
	}

	const hintTextElement = createMemo(() => {
		return props.hintText ? (
			<div {...stylex.attrs(styles.hint)}>{props.hintText}</div>
		) : undefined
	})

	return (
		<FieldLayout
			label={props.label}
			error={props.field.errors?.[0]}
			hint={hintTextElement()}
			styles={props.styles}
		>
			<div {...stylex.attrs(styles.inputContainer)}>
				<InputField.Input
					{...props.field.props}
					styles={authStyles.input}
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
					<div {...stylex.attrs(styles.requirementsPopover)}>
						<div {...stylex.attrs(styles.requirementsHeading)}>
							PASSWORD REQUIREMENTS
						</div>
						<ul {...stylex.attrs(styles.requirementsList)}>
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
									<code {...stylex.attrs(styles.allowedSymbols)}>
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

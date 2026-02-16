import * as v from "valibot"

import {
	USER_PASSWORD_MAX_LENGTH,
	USER_PASSWORD_MIN_LENGTH,
	USER_PASSWORD_REGEX_STR,
} from "~/constant/server"

export const SignIn = v.object({
	username: v.string(),
	password: v.string(),
})
export type SignIn = v.InferInput<typeof SignIn>

const Email = v.pipe(
	v.string(),
	v.minLength(1, "Email is required"),
	v.email("Invalid email"),
)

const PASSWORD_REGEX = new RegExp(USER_PASSWORD_REGEX_STR)
// eslint-disable-next-line no-control-regex
const PASSWORD_WHITESPACE_REGEX = /[\s\u0000-\u001F\u007F]/
const Password = v.pipe(
	v.string(),
	v.minLength(
		USER_PASSWORD_MIN_LENGTH,
		"Password must be at least 8 characters",
	),
	v.maxLength(
		USER_PASSWORD_MAX_LENGTH,
		"Password must be at most 64 characters",
	),
	v.check(
		(input) => !PASSWORD_WHITESPACE_REGEX.test(input),
		"Password contains invalid or whitespace characters",
	),
	v.regex(PASSWORD_REGEX, "Password contains invalid or whitespace characters"),
)

export const SignUp = v.pipe(
	v.object({
		username: v.string(),
		email: Email,
		password: Password,
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
export type SignUp = v.InferInput<typeof SignUp>

export const VerifyEmail = v.object({
	code: v.pipe(
		v.string(),
		v.minLength(6, "Verification code must be 6 digits"),
		v.maxLength(6, "Verification code must be 6 digits"),
		v.regex(/^\d{6}$/, "Invalid verification code"),
	),
})
export type VerifyEmail = v.InferInput<typeof VerifyEmail>

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

const PASSWORD_REGEX = new RegExp(USER_PASSWORD_REGEX_STR)
const PASSWORD_WHITESPACE_REGEX = /[\s\x00-\x1F\x7F]/
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

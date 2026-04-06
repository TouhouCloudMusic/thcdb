import * as v from "valibot"

import {
	USER_PASSWORD_MAX_LENGTH,
	USER_PASSWORD_MIN_LENGTH,
	USER_PASSWORD_REGEX_STR,
} from "~/constant/server"
import { isPasswordStrongEnough } from "~/domain/auth/password_strength"

export const SignIn = v.object({
	identifier: v.string(),
	password: v.string(),
})
export type SignIn = v.InferInput<typeof SignIn>

const Email = v.pipe(
	v.string(),
	v.minLength(1, "Email is required"),
	v.email("Invalid email"),
)

const VerificationCode = v.pipe(
	v.string(),
	v.minLength(6, "Verification code must be 6 digits"),
	v.maxLength(6, "Verification code must be 6 digits"),
	v.regex(/^\d{6}$/, "Invalid verification code"),
)

const PASSWORD_REGEX = new RegExp(USER_PASSWORD_REGEX_STR)
const PASSWORD_WHITESPACE_REGEX = /[\s\u0000-\u001F\u007F]/
const Password = v.pipe(
	v.string(),
	v.minLength(
		USER_PASSWORD_MIN_LENGTH,
		`Password must be at least ${USER_PASSWORD_MIN_LENGTH} characters`,
	),
	v.maxLength(
		USER_PASSWORD_MAX_LENGTH,
		`Password must be at most ${USER_PASSWORD_MAX_LENGTH} characters`,
	),
	v.check(
		(input) => !PASSWORD_WHITESPACE_REGEX.test(input),
		"Password contains invalid or whitespace characters",
	),
	v.regex(PASSWORD_REGEX, "Password contains invalid or whitespace characters"),
	v.rawCheck((context) => {
		if (!context.dataset.typed) return
		if (isPasswordStrongEnough(context.dataset.value)) return
		context.addIssue({
			message: "Password too weak",
		})
	}),
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
	code: VerificationCode,
})
export type VerifyEmail = v.InferInput<typeof VerifyEmail>

export const ForgotPassword = v.object({
	email: Email,
})
export type ForgotPassword = v.InferInput<typeof ForgotPassword>

export const VerifyResetCode = v.object({
	email: Email,
	code: VerificationCode,
})
export type VerifyResetCode = v.InferInput<typeof VerifyResetCode>

export const ResetPassword = v.pipe(
	v.object({
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
export type ResetPassword = v.InferInput<typeof ResetPassword>

import * as v from "valibot"

export const SignIn = v.object({
	username: v.string(),
	password: v.string(),
})
export type SignIn = v.InferInput<typeof SignIn>

export const SignUp = v.pipe(
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
export type SignUp = v.InferInput<typeof SignUp>

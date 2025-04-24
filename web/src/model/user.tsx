import { type } from "arktype"
import { type components } from "~/data/openapi"

export type UserProfile = components["schemas"]["UserProfile"]
export type UserRole = components["schemas"]["UserRoleEnum"]

export const auth_creds = type({
	username: "string",
	password: "string",
})

export type AuthCreds = typeof auth_creds.infer

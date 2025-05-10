import { type OpenApiSchema } from ".."

export * as UserMutation from "./mutation"
export * as UserFetcher from "./fetcher"
export * as UserQuery from "./query"

export type UserProfile = OpenApiSchema["UserProfile"]
export type UserRole = OpenApiSchema["UserRoleEnum"]

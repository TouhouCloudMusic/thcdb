import createFetchClient from "openapi-fetch"
import type { Expand, RevExactRecursive } from "~/types"

import type { paths, components } from "./openapi"

export type OpenApiSchema = Expand<RevExactRecursive<components["schemas"]>>

export const FetchClient = createFetchClient<Expand<RevExactRecursive<paths>>>({
	baseUrl: "/api",
})

export * from "./user"
export * from "./auth"

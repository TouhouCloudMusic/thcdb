import createFetchClient from "openapi-fetch"

import type { paths, components } from "./openapi"

export type OpenApiSchema = components["schemas"]

export const FetchClient = createFetchClient<paths>({
	baseUrl: "/api",
})

export * from "./user"

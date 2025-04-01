import createFetchClient from "openapi-fetch"

import type { paths } from "./openapi"

export const FetchClient = createFetchClient<paths>({
  baseUrl: "/api",
})

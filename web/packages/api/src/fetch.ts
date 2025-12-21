import createFetchClient from "openapi-fetch"

import type { paths } from "./gen"

export const FetchClient = createFetchClient<paths>({ baseUrl: "/api" })

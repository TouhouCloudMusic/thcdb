import createFetchClient from "openapi-fetch"
import createClientR from "openapi-react-query"
import { CONFIG } from "~/config"

import type { paths } from "./openapi"
import createClient from "./openapi_solid_query"

export const FetchClient = createFetchClient<paths>({
  baseUrl: "/api",
})

export const QueryClient = createClient(FetchClient)

export * as Query from "./prelude"

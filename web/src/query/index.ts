import createFetchClient from "openapi-fetch"
import createClient from "openapi-react-query"
import { CONFIG } from "~/config"

import type { paths } from "./openapi"

export const FetchClient = createFetchClient<paths>({
  baseUrl: CONFIG.server_base_url,
})

export const QueryClient = createClient(FetchClient)

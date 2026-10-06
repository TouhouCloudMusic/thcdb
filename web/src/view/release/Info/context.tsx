import { createContext } from "solid-js"

import type { Release } from "~/hey-api"

export type ReleaseInfoPageContext = {
	release: Release
}

export const ReleaseInfoPageContext = createContext<ReleaseInfoPageContext>()

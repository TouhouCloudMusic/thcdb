import type { Release } from "@thc/api"
import { createContext } from "solid-js"

export type ReleaseInfoPageContext = {
	release: Release
}

export const ReleaseInfoPageContext = createContext<ReleaseInfoPageContext>()

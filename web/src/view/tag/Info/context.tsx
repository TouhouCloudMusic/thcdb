import type { Tag } from "@thc/api"
import { createContext } from "solid-js"

type Value = {
	tag: Tag
}

export const TagInfoPageContext = createContext<Value>()

export type TagInfoPageContextValue = Value

import type { Label } from "@thc/api"
import { createContext } from "solid-js"

type Value = {
	label: Label
}

export const LabelInfoPageContext = createContext<Value>()

export type LabelInfoPageContextValue = Value

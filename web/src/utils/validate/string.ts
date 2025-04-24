import { type Nullable } from "~/types"

export function isNonEmpty(str: Nullable<string>) {
	return !!str && str.length > 0
}

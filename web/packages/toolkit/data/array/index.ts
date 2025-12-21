import type { nil } from "../../types"
import { dual } from "../dual"

export const mapOrDefault: {
	<A, B>(self: A[] | nil, f: (x: A) => B): B[]
	<A, B>(f: (x: A) => B): (self: A[] | nil) => B[]
} = dual(2, <A, B>(self: A[] | nil, f: (x: A) => B): B[] => {
	return self?.map(f) ?? []
})

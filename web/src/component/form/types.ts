import type { FieldArrayStore, FieldStore } from "@formisch/solid"
import type { Accessor } from "solid-js"

export type FieldBinding<Value> = Pick<FieldStore, "props" | "errors"> & {
	readonly path: readonly (string | number)[]
	readonly input: Value | undefined
	readonly onInput: (value: Value | undefined) => void
}

export type ArrayField<Value> = Pick<FieldArrayStore, "items" | "errors"> & {
	readonly fieldAt: (index: Accessor<number>) => FieldBinding<Value>
	readonly append: () => void
	readonly remove: (index: number) => void
}

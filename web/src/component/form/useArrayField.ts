import type {
	FormSchema,
	FormStore,
	RequiredPath,
	UseFieldArrayConfig,
	ValidPath,
} from "@formisch/solid"
import { insert, remove, useField, useFieldArray } from "@formisch/solid"
import type { Accessor } from "solid-js"
import type { InferInput } from "valibot"

export function useArrayField<
	Schema extends FormSchema,
	const Path extends RequiredPath,
>(form: FormStore<Schema>, config: UseFieldArrayConfig<Schema, Path>) {
	type ItemPath = readonly [...Path, number]

	const array = useFieldArray(form, config)

	return {
		get items() {
			return array.items
		},
		get errors() {
			return array.errors
		},
		fieldAt: (index: Accessor<number>) =>
			useField<Schema, ItemPath>(form, () => ({
				// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Appending an index to the schema's array path yields an item path.
				path: [...array.path, index()] as [...typeof array.path, number]
					& ValidPath<InferInput<Schema>, ItemPath>,
			})),
		append: () => insert(form, config),
		remove: (at: number) => remove(form, { ...config, at }),
	}
}

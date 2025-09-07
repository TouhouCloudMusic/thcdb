// oxlint-disable no-unused-vars
import type { JSX, ParentProps } from "solid-js"
import { createContext } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { assertContext } from "~/utils/solid"

export type ComboboxListContext = {
	all(): HTMLElement[]
	first(): HTMLElement | undefined
	push(elm: HTMLElement): number
	remove(idx: number): void
}

const ListContext = createContext<ComboboxListContext>()
const useListContext = (): ComboboxListContext => assertContext(ListContext)

function ListContextProvider(props: ParentProps): JSX.Element {
	let [store, setStore] = createStore([] as HTMLElement[])
	let value = {
		all() {
			return store
		},
		first() {
			return store[0]
		},
		push(elm) {
			let ret: number
			setStore(
				produce((s) => {
					ret = s.push(elm)
				}),
			)
			return ret!
		},
		remove(idx) {
			setStore(produce((s) => s.splice(idx, 1)))
		},
	} satisfies ComboboxListContext
	return (
		<ListContext.Provider value={value}>{props.children}</ListContext.Provider>
	)
}

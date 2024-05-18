import { onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { Atom } from "~/util/createAtom"

export default function Test() {
	const count = createAtom<number>()
	onMount(() => {
		count(0)
	})
	return (
		<div class="flex flex-col">
			<div>Count {count()}</div>
			<button onClick={() => count((count) => count! + 1)}>+</button>
		</div>
	)
}

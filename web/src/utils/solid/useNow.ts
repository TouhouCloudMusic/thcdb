import { createSignal, onCleanup, onMount } from "solid-js"

export function useNow(intervalMs = 60_000) {
	const [now, setNow] = createSignal(Date.now())
	onMount(() => {
		const id = setInterval(() => setNow(Date.now()), intervalMs)
		onCleanup(() => clearInterval(id))
	})
	return now
}

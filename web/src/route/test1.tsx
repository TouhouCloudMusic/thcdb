import { createEffect, onMount } from "solid-js"
import { SetStoreFunction } from "solid-js/store"
import { ControllerBase } from "~/component/UserPage/UserDataProvider"
import { createProviderC } from "~/util/createProvider"

interface Counter {
	count: number
}
// class CounterController extends ControllerBase<Counter> {
// 	get count() {
// 		return this.state.count
// 	}

// 	inc() {
// 		this.setState("count", (c) => c + 1)
// 	}
// }
// function CounterComp() {
// 	const Counter = useCounter()
// 	onMount(() => {
// 		console.log(Counter)
// 	})
// 	return (
// 		<>
// 			<div>count: {Counter.count}</div>
// 			<button onClick={() => Counter.inc()}>+</button>
// 		</>
// 	)
// }

class CounterController  {
	count!: () => number
	inc!: () => void
	constructor(state: Counter, setState: SetStoreFunction<Counter>) {

		this.count = () => state.count
		this.inc = () => setState("count", (c) => c + 1)
	}
}
function CounterComp() {
	const Counter= useCounter()
	createEffect(() => {
		console.log(Counter.)
	})
	return (
		<>
			<div>count: {count()}</div>
			<button onClick={() => inc()}>+</button>
		</>
	)
}

const [CounterProvider, useCounter] = createProviderC(CounterController)

export default function CounterPage() {
	return (
		<CounterProvider defaultState={{ count: 0 }}>
			<CounterComp />
		</CounterProvider>
	)
}

// function CounterComp() {
// 	const Counter = useCounter()
// 	const count = () => Counter.count
// 	const inc = () => Counter.inc()
// 	return (
// 		<>
// 			<div>count: {count()}</div>
// 			<button onClick={() => inc()}>+</button>
// 		</>
// 	)
// }

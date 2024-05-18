import { createSignal, createContext, useContext } from "solid-js";
import { createStore } from "solid-js/store";

const CounterContext = createContext();

function CounterProvider(props) {
	const [count, setCount] = createStore({ value: 0 }),
		counter = [
			() => count.value,
			{
				increment() {
					setCount("value", 1);
				},
				decrement() {
					setCount("value", -1);
				}
			}
		];

	return (
		<CounterContext.Provider value={counter}>
			{props.children}
		</CounterContext.Provider>
	);
}
function useCounter() {
	return useContext(CounterContext);
}

function Nested() {
	const [count, { increment, decrement }] = useCounter();
	return (
		<>
			<div>{count()}</div>
			<button onClick={increment}>+</button>
			<button onClick={decrement}>-</button>
		</>
	);
}

export default function Test() {
	return (
		<CounterProvider count={1}>
			<h1>Welcome to Counter App</h1>
			<Nested />
		</CounterProvider>
	);
}
// import { createSignal, createContext, useContext } from "solid-js";

// const CounterContext = createContext();

// function CounterProvider(props) {
// 	const [count, setCount] = createSignal(props.count || 0),
// 		counter = [
// 			count,
// 			{
// 				increment() {
// 					setCount((c) => c + 1);
// 				},
// 				decrement() {
// 					setCount((c) => c - 1);
// 				}
// 			}
// 		];

// 	return (
// 		<CounterContext.Provider value={counter}>
// 			{props.children}
// 		</CounterContext.Provider>
// 	);
// }
// function useCounter() {
// 	return useContext(CounterContext);
// }

// function Nested() {
// 	const [count, { increment, decrement }] = useCounter();
// 	return (
// 		<>
// 			<div>{count()}</div>
// 			<button onClick={increment}>+</button>
// 			<button onClick={decrement}>-</button>
// 		</>
// 	);
// }

// export default function Test() {
// 	return (
// 		<CounterProvider count={1}>
// 			<h1>Welcome to Counter App</h1>
// 			<Nested />
// 		</CounterProvider>
// 	);
// }

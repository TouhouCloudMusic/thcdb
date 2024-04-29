/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Accessor, createSignal } from "solid-js";
import "./Counter.css";
import { $Signal } from "./$Signal";

export default function Counter() {
	const count = $Signal(0);
	return (
		<button
			class="increment"
			onClick={() => count.set(count.value() + 1)}>
			Clicks: {count.value()}
		</button>
	);
}

import { Show, createEffect, createSignal, onMount } from "solid-js";
import { useFloating } from "solid-floating-ui";
import { autoUpdate, computePosition, shift } from "@floating-ui/dom";

export default function Test() {
	const [trigger, triggerRef] = createSignal<HTMLElement>();
	const [tooltip, tooltipRef] = createSignal<HTMLElement>();
	const [show, setShow] = createSignal(false);
	const position = useFloating(trigger, tooltip, {
		placement: "bottom",
		whileElementsMounted: autoUpdate,
		middleware: [shift({ crossAxis: true, mainAxis: false })],
	});

	return (
		<>
			<div>
				<button
					ref={triggerRef}
					class="m-2 rounded-md bg-white p-2"
					onClick={() => setShow(!show())}>
					Button
				</button>
				<Show when={show()}>
					<div
						class="absolute rounded-md bg-white p-2"
						ref={tooltipRef}
						style={{
							position: position.strategy,
							top: `${position.y ?? 0}px`,
							left: `${position.x ?? 0}px`,
						}}>
						Tooltip
					</div>
				</Show>
			</div>
		</>
	);
}

import { Index, type JSX } from "solid-js"
import { scope_title_tw } from "../../style"

export function SearchAristCard<
	T extends {
		name: string
	},
>(props: {
	label: string
	placeholder: string
	disableSearch: boolean
	onInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent>
	searchResult: T[] | undefined
	handleAdd: (x: T) => void
}) {
	return (
		<div class="flex flex-col">
			<h4 class={scope_title_tw}>{props.label}</h4>
			<input
				type="text"
				class="px-1"
				disabled={props.disableSearch}
				placeholder={props.placeholder}
				onInput={props.onInput}
			/>
			<div class="relative">
				<div class="absolute w-full">
					<Index each={props.searchResult}>
						{(result) => (
							<button
								type="button"
								class="border-sm my-2 w-full border-gray-300 bg-white px-2"
								onClick={() => props.handleAdd(result())}>
								{result().name}
							</button>
						)}
					</Index>
				</div>
			</div>
		</div>
	)
}

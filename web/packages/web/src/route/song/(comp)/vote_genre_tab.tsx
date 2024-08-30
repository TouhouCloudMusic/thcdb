import { autoUpdate, offset } from "@floating-ui/dom"
import { type UseFloatingResult, useFloating } from "solid-floating-ui"
import { For, Index, type Setter, Show, createSignal } from "solid-js"
import { createAtom } from "~/util/createAtom"
import { useSongData } from "../controller"
export function VoteGenreTab(props: {
	voteTabRef: Setter<HTMLElement | undefined>
	position: UseFloatingResult
	setShow: Setter<boolean>
}) {
	const { genres } = useSongData()
	const [inputEl, inputElRef] = createSignal<HTMLInputElement>()
	const resultDropdown = createAtom<HTMLElement>()
	const [dropdownShow, setDropdownShow] = createSignal(false)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [genreResult, setGenreResult] = createSignal([
		"Test Genre 0",
		"Test Genre 1",
		"Test Genre 2",
	])
	const dropdownPosition = useFloating(inputEl, resultDropdown, {
		placement: "bottom-start",
		whileElementsMounted: autoUpdate,
		middleware: [offset(5)],
	})
	return (
		<div
			class="z-20 grid h-[100%] w-full place-items-center"
			ref={props.voteTabRef}
			style={{
				position: props.position.strategy,
				top: 0,
				left: 0,
				transform: `translate3d(${props.position.x ?? 0}px,${props.position.y ?? 0}px,0)`,
				transition: "transform 0s",
			}}>
			<div class="min-h-fit w-[40vw] border border-gray-300 bg-gray-100/95 p-4 shadow-md shadow-gray-300">
				<div class="flex w-full flex-row-reverse">
					<button
						class="text-gray-500"
						onClick={() => props.setShow(false)}>
						<p>close</p>
					</button>
				</div>
				<div class="flex w-48 flex-col">
					<input
						type="text"
						ref={inputElRef}
						class="w-52 rounded border border-gray-300 bg-white pl-2"
						placeholder="Search Genres"
						onFocusIn={() => setDropdownShow(true)}
						onFocusOut={() => setDropdownShow(false)}
					/>
					<Show when={dropdownShow()}>
						<ul
							ref={resultDropdown}
							class="w-max items-center divide-y divide-gray-200 border border-gray-300 bg-white p-2"
							style={{
								position: dropdownPosition.strategy,
								top: 0,
								left: 0,
								// transform: `translate3d(${dropdownPosition.x ?? 0}px,${dropdownPosition.y ?? 0}px,0)`,
							}}>
							<Index each={genreResult()}>
								{(item) => (
									<li class="my-auto grid w-max grid-flow-row grid-cols-6 items-center justify-between bg-white px-2 py-1">
										<a
											href=""
											class="col-span-3">
											{item()}
										</a>
										<button class="mx-1 h-4/5 rounded bg-green-500 px-1 text-white">
											***
										</button>
										<button class="mx-1 h-4/5 rounded bg-green-500 px-1 text-white">
											**
										</button>
										<button class="mx-1 h-4/5 rounded bg-green-500 px-1 text-white">
											*
										</button>
									</li>
								)}
							</Index>
						</ul>
					</Show>
				</div>
				<For each={genres()}>
					{(genre) => (
						<div class="my-2 divide-y-2 divide-gray-300 border bg-white px-2 py-1 shadow">
							<div class="flex items-center justify-between">
								<p>{genre}</p>
								<div class="grid grid-cols-4 items-center">
									<button class="mx-1 h-4/5 rounded bg-green-500 px-1 text-white">
										***
									</button>
									<button class="mx-1 h-4/5 rounded bg-green-500 px-1 text-white">
										**
									</button>
									<button class="mx-1 h-4/5 rounded bg-green-500 px-1 text-white">
										*
									</button>
									<button class="mx-1 h-4/5 rounded bg-red-500 px-1 text-white">
										-
									</button>
								</div>
							</div>
							<div class="py-1">
								<Index each={["***", "**", "*", "-"]}>
									{(item) => (
										<div class="flex">
											<p class="w-[1.5rem]">{item()}</p>
											{` : `}
											<ul class="flex">
												<Index each={new Array(5)}>
													{(item, index) => (
														<li>
															<a>{`User ${index}`}</a>
															{index !== 4 ? ", " : ""}
														</li>
													)}
												</Index>
											</ul>
											{/* <div class="justify-self-end">123</div> */}
										</div>
									)}
								</Index>
							</div>
						</div>
					)}
				</For>
			</div>
		</div>
	)
}

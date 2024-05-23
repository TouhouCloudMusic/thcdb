import { Title } from "@solidjs/meta"
import { For, JSX } from "solid-js"
import { ThemeButton } from "~/component/ThemeButton"

export default function () {
	return (
		<main class="flex flex-col">
			<Title>Theme</Title>
			<div
				class="grid h-auto grid-flow-col gap-3 py-4 w-fit"
				style={{
					"grid-template-columns": "repeat(8, 1fr)",
					"grid-template-rows": "repeat(12, 1fr)",
				}}>
				<ThemeButton />
				<button class=" button px-3 py-1">Borderless</button>
				<button class=" border_button">With Border</button>
				<button
					class="button"
					disabled>
					Disabled
				</button>
				<button class=" highlight_button">Highlight</button>
				<button class=" highlight_button">Highlight</button>
			</div>
			<ColorPanel />
		</main>
	)
}

function ColorPanel() {
	const colorRowClass =
		"my-2 grid grid-flow-col grid-rows-2 size-fit gap-2 rounded-md"

	const colorItemStyle: JSX.CSSProperties = {
		// "border-width": "1px",
		"border-radius": "0.25rem",
		height: "2.5rem",
		width: "4rem",
		// "box-shadow": "inset 0 1px 0 0 rgb(0 0 0 / 0.08)",
	}

	const colors = [
		"gray",
		"red",
		"orange",
		// "yellow",

		"green",

		"cyan",
		"blue",
		// "indigo",
		"purple",
		// "grape",
		"pink",
	]

	function colorConvert(color: string) {
		if (color == "pink") return "crimson"
		if (color == "orange") return "amber"
		else return color
	}
	return (
		<main class="grid-row-10 grid grid-flow-row gap-2">
			<div class="grid size-fit grid-cols-3 gap-2">
				<div class="place-content-center text-center text-gray-1000">
					Bg
				</div>
				<div
					style={{
						...colorItemStyle,
						"background-color": "hsl(var(--bg-main))",
						"box-shadow": "var(--shadow-3)",
					}}></div>
				<div
					style={{
						...colorItemStyle,
						"background-color": `hsl(var(--bg-highlight))`,
						"box-shadow": "var(--shadow-3)",
					}}></div>
			</div>
			<For each={colors}>
				{(color) => (
					<>
						<div class="my-2 grid grid-flow-col grid-cols-12 grid-rows-1 size-fit gap-2 rounded-md">
							<div
								class="place-content-center text-center"
								style={{
									color: `hsl(var(--${color}-800))`,
								}}>
								{color[0].toUpperCase() + color.slice(1)}
							</div>
							<For each={new Array(10)}>
								{(_, idx) => (
									<>
										<div
											style={{
												...colorItemStyle,
												"background-color": `hsl(var(--${color}-${(idx() + 1) * 100}))`,
											}}></div>
									</>
								)}
							</For>
						</div>
						{/* Radix Colors */}
						{/* <div class="my-2 grid grid-flow-col grid-cols-12 grid-rows-1 size-fit gap-2 rounded-md">
							<div
								class="place-content-center text-center"
								style={{
									color: `var(--${color}-8))`,
								}}></div>
							<For each={new Array(12)}>
								{(_, idx) => (
									<>
										<div
											style={{
												...colorItemStyle,
												"background-color": `var(--${colorConvert(color)}-${idx() + 3})`,
											}}></div>
									</>
								)}
							</For>
						</div> */}
					</>
				)}
			</For>
		</main>
	)
}

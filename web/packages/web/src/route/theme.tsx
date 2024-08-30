import { Title } from "@solidjs/meta"
import { A } from "@solidjs/router"
import { For, type JSX } from "solid-js"
import { ThemeButton } from "~/component/theme_button"
export default function () {
	return (
		<main class="flex flex-col place-content-center items-center justify-center">
			<Title>Theme</Title>
			<div class="my-4">
				<ColorPanel />
			</div>
			<div
				class="grid h-auto w-fit grid-flow-col gap-3 py-4"
				style={{
					"grid-template-columns": "repeat(8, 1fr)",
					"grid-template-rows": "repeat(12, 1fr)",
				}}>
				<Buttons />
				<Links />
			</div>
		</main>
	)
}

function ColorPanel() {
	const colorItemStyle: JSX.CSSProperties = {
		"border-radius": "0.25rem",
		height: "2.5rem",
		width: "4rem",
	}

	const colors = [
		"gray",
		"red",
		"orange",
		"green",
		"cyan",
		"blue",
		"purple",
		"pink",
	]

	return (
		<div class="grid-row-10 grid grid-flow-row gap-2">
			<div class="grid size-fit grid-cols-3 gap-2">
				<div class="text-gray-1000 place-content-center text-center">Bg</div>
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
						<div class="my-2 grid size-fit grid-flow-col grid-cols-12 grid-rows-1 gap-2 rounded-md">
							<div
								class="place-content-center text-center"
								style={{
									color: `hsl(var(--${color}-800))`,
								}}>
								{color[0].toUpperCase() + color.slice(1)}
							</div>
							<For each={Array.from({ length: 10 })}>
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
					</>
				)}
			</For>
		</div>
	)
}

function Buttons() {
	return (
		<>
			<div class="row-span-12 grid grid-rows-subgrid items-center text-center font-bold">
				<div>Button</div>
			</div>
			<ThemeButton />
			<button class="button px-3 py-1">Borderless</button>
			<button class="border_button">With Border</button>
			<button
				class="button"
				disabled>
				Disabled
			</button>
			<button class="highlight_button">Highlight</button>
			<button class="warning_button">Warning</button>
		</>
	)
}

function Links() {
	const linkClass = "place-content-center text-center"
	return (
		<>
			<div class="row-span-12 grid grid-rows-subgrid items-center text-center font-bold">
				<div id="link">Link</div>
			</div>

			<a
				class={`link ${linkClass}`}
				href="/114514">
				Normal
			</a>
			<A
				class={`link_gray ${linkClass}`}
				href="/">
				Gray
			</A>
		</>
	)
}

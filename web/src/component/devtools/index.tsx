import { TanStackDevtools } from "@tanstack/solid-devtools"
import { SolidQueryDevtoolsPanel } from "@tanstack/solid-query-devtools"
import { TanStackRouterDevtoolsPanel } from "@tanstack/solid-router-devtools"
import type { Component } from "solid-js"

export const Devtools: Component<{
	"open-router-panel"?: boolean
	"open-query-panel"?: boolean
}> = (props) => {
	return (
		<TanStackDevtools
			plugins={[
				{
					name: "TanStack Router",
					render: <TanStackRouterDevtoolsPanel />,
					defaultOpen: props["open-router-panel"] ?? false,
				},
				{
					name: "TanStack Query",
					render: <SolidQueryDevtoolsPanel />,
					defaultOpen: props["open-query-panel"] ?? false,
				},
			]}
		/>
	)
}

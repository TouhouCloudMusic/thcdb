import { Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { createMemo, ErrorBoundary, type ParentProps, Show } from "solid-js"
import { Header } from "~/component/header/index.tsx"
import ErrorPage from "./route/500"
import { useI18N } from "./state/i18n"
import { Providers } from "./state/index.tsx"

import "./app.css"

export default function App() {
	return (
		<Providers>
			<Routes />
		</Providers>
	)
}

function Routes() {
	return (
		<Router root={(props) => <Layout {...props} />}>
			<CustomErrorBoundary>
				<FileRoutes />
			</CustomErrorBoundary>
		</Router>
	)
}

function Layout(props: ParentProps) {
	const layoutStyle = createMemo(() =>
		useI18N().duringTransition() ?
			{
				transition: "color .3s",
				"transition-delay": ".1s",
				"transition-timing-function": "ease-in",
			}
		:	undefined
	)

	return (
		<div
			class="flex min-h-full flex-col"
			style={layoutStyle()}>
			<Title>Doujin Cloud DB</Title>
			<Header />
			<div class="grow border-t">
				<div class="mx-auto min-h-[calc(100vh-2.5rem)] max-w-7xl">
					{props.children}
				</div>
			</div>
			<footer class="bg-gray-1000 mt-20 h-[300px]"></footer>
		</div>
	)
}

function CustomErrorBoundary(props: ParentProps) {
	return (
		<Show
			when={import.meta.env.DEV}
			fallback={
				<ErrorBoundary
					fallback={(e: Error) => (
						<>
							<ErrorPage msg={e.stack} />
						</>
					)}>
					{props.children}
				</ErrorBoundary>
			}>
			{props.children}
		</Show>
	)
}

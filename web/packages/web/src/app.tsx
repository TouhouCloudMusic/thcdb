import { Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { ErrorBoundary, type ParentProps, Show, Suspense } from "solid-js"
import Header from "~/component/header/header"
import "./app.css"
import ErrorPage from "./route/500"
import { I18NTranstionStyle, useI18N } from "./state/i18n"
import { Providers } from "./state/index.tsx"

function Routes() {
	return (
		<Router
			root={(props) => (
				<>
					<Title>Doujin Cloud DB</Title>
					<Header />
					{props.children}
				</>
			)}>
			<FileRoutes />
		</Router>
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

export default function App() {
	return (
		<Suspense>
			<CustomErrorBoundary>
				<Providers>
					<div
						style={{
							...(useI18N().duringTransition() ? I18NTranstionStyle : {}),
						}}
						id="app_wrapper">
						<Routes />
					</div>
				</Providers>
			</CustomErrorBoundary>
		</Suspense>
	)
}

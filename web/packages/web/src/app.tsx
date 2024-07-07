import { MetaProvider, Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { ErrorBoundary, Show, Suspense, createResource } from "solid-js"
import Header from "~/component/header/header"
import "./app.css"
import ErrorPage from "./route/500"
import { AppStateProvider, devAppState } from "./state/app.state"
import { getCookieTheme } from "./state/theme"
function App() {
	return (
		<Router
			root={(props) => (
				<>
					<Title>Doujin Cloud DB</Title>
					<Header />
					<Suspense>{props.children}</Suspense>
				</>
			)}>
			<FileRoutes />
		</Router>
	)
}

export default () => {
	const [serverTheme] = createResource(() => getCookieTheme())
	const initTheme = parseInt(serverTheme()?.toString() ?? "0", 10)
	return (
		<MetaProvider>
			<AppStateProvider
				defaultState={{
					...devAppState,
					theme: initTheme,
				}}>
				<Show
					when={import.meta.env.DEV}
					fallback={
						<ErrorBoundary
							fallback={(e: Error) => (
								<>
									<ErrorPage msg={e.stack} />
								</>
							)}>
							<App />
						</ErrorBoundary>
					}>
					<App />
				</Show>
			</AppStateProvider>
		</MetaProvider>
	)
}

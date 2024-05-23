import { MetaProvider, Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense, createResource } from "solid-js"
import "./app.css"
import { AppStateProvider, AppTheme, devAppState } from "./state/app.state"
import Header from "~/component/Header/Header"
import { getCookieTheme } from "./state/theme"

function App() {
	return (
		<Router
			root={(props) => (
				<MetaProvider>
					<Title>Doujin Cloud DB</Title>
					<Header />
					<Suspense>{props.children}</Suspense>
				</MetaProvider>
			)}>
			<FileRoutes />
		</Router>
	)
}

export default () => {
	const [serverTheme] = createResource(
		() => getCookieTheme() ?? AppTheme.light
	)
	const initTheme = parseInt(serverTheme()?.toString() ?? "0", 10)
	return (
		// <Suspense fallback={<div>Loading...</div>}>
		<AppStateProvider
			defaultState={{
				...devAppState,
				theme: initTheme,
			}}>
			<App />
		</AppStateProvider>
		// </Suspense>
	)
}

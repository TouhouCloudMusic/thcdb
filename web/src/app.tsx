import { MetaProvider, Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { Suspense } from "solid-js"
import "./app.css"
import { AppStateProvider, devAppState } from "./state/app.state"
import Header from "~/component/Header/Header"

export default function App() {
	return (
		<AppStateProvider defaultState={devAppState}>
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
		</AppStateProvider>
	)
}

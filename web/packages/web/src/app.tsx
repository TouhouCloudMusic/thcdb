import { Title } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { FileRoutes } from "@solidjs/start/router"
import { ErrorBoundary, Show, Suspense } from "solid-js"
import Header from "~/component/header/header"
import "./app.css"
import ErrorPage from "./route/500"
import { Providers } from "./state/index.tsx"

function Routes() {
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
	return (
		<Providers>
			<Show
				when={import.meta.env.DEV}
				fallback={
					<ErrorBoundary
						fallback={(e: Error) => (
							<>
								<ErrorPage msg={e.stack} />
							</>
						)}>
						<Routes />
					</ErrorBoundary>
				}>
				<Routes />
			</Show>
		</Providers>
	)
}

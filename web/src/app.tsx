import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";
import { AppStateProvider, defaultAppState } from "./states/app.state";
import Header from "./components/Header/Header";

export default function App() {
	return (
		<AppStateProvider defaultState={defaultAppState}>
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
	);
}

import { MetaProvider } from "@solidjs/meta"
import { JSX } from "solid-js"
import { AppStateProvider } from "./app_state"
import { I18NProvider } from "./i18n"

export function Providers(props: { children: JSX.Element }) {
	return (
		<MetaProvider>
			<I18NProvider>
				<AppStateProvider>{props.children}</AppStateProvider>
			</I18NProvider>
		</MetaProvider>
	)
}

import { MetaProvider } from "@solidjs/meta"
import type { ParentProps } from "solid-js"

import type { AppLocale } from "./i18n"
import { I18NProvider } from "./i18n"
import { TanStackProvider as QueryProvider } from "./tanstack"
import { ThemeProvider } from "./theme"
import { UserContextProvider } from "./user"

export function StateProvider(
	props: ParentProps<{ initialLocale: AppLocale }>,
) {
	return (
		<MetaProvider>
			<QueryProvider>
				<I18NProvider initialLocale={props.initialLocale}>
					<UserContextProvider>
						<ThemeProvider>{props.children}</ThemeProvider>
					</UserContextProvider>
				</I18NProvider>
			</QueryProvider>
		</MetaProvider>
	)
}

import { MetaProvider } from "@solidjs/meta"
import { type ParentProps } from "solid-js"

import { I18NProvider } from "./i18n"
import { TanStackProvider } from "./tanstack"
import { ThemeProvider } from "./theme"
import { UserContextProvider } from "./user"

export function StateProvider(props: ParentProps) {
  return (
    <MetaProvider>
      <TanStackProvider>
        <I18NProvider>
          <UserContextProvider user={undefined}>
            <ThemeProvider>{props.children}</ThemeProvider>
          </UserContextProvider>
        </I18NProvider>
      </TanStackProvider>
    </MetaProvider>
  )
}

import { SessionProvider } from "@solid-mediakit/auth/client"
import { MetaProvider } from "@solidjs/meta"
import { type ParentProps } from "solid-js"
import { I18NProvider } from "./i18n/provider"
import { TanStackProvider } from "./tanstack"
import { ThemeProvider } from "./theme"
import { UserStateProvider } from "./user"

export function Providers(props: ParentProps) {
  return (
    <MetaProvider>
      <SessionProvider>
        <TanStackProvider>
          <UserStateProvider>
            <I18NProvider>
              <ThemeProvider>{props.children}</ThemeProvider>
            </I18NProvider>
          </UserStateProvider>
        </TanStackProvider>
      </SessionProvider>
    </MetaProvider>
  )
}

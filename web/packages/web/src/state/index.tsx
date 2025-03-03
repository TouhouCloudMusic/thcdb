import { MetaProvider } from "@solidjs/meta"
import { type ParentProps } from "solid-js"
import { TanStackProvider } from "./tanstack"
import { ThemeProvider } from "./theme"
import { I18NProvider } from "./i18n"

export function Providers(props: ParentProps) {
  return (
    <MetaProvider>
      <TanStackProvider>
        <I18NProvider>
          <ThemeProvider>{props.children}</ThemeProvider>
        </I18NProvider>
      </TanStackProvider>
    </MetaProvider>
  )
}

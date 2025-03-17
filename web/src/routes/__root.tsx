import * as meta from "@solidjs/meta"
import { Title } from "@solidjs/meta"
import { createRootRoute, Outlet } from "@tanstack/solid-router"
import { TanStackRouterDevtools } from "@tanstack/solid-router-devtools"
import { ErrorBoundary, type ParentProps } from "solid-js"
import { Header } from "~/components/header"
import ErrorPage from "~/route/500.tsx"

export const Route = createRootRoute({
  component: () => (
    <Layout>
      <AppErrorBoundary>
        <Outlet />
        <TanStackRouterDevtools />
      </AppErrorBoundary>
    </Layout>
  ),
})

function Layout(props: ParentProps) {
  // TODO: Need fix, transition bettwen language change
  // const layoutStyle = createMemo(() =>
  //   useI18N().duringTransition() ?
  //     {
  //       transition: "color .3s",
  //       "transition-delay": ".1s",
  //       "transition-timing-function": "ease-in",
  //     }
  //   : undefined,
  // )

  return (
    <div class="grid grid-rows-[auto_1fr_auto] h-full">
      <Title>Doujin Cloud DB</Title>
      <meta.Link
        rel="shortcut icon"
        href="/logo.svg"
        type="image/x-icon"
      />
      <Header />
      <main>{props.children}</main>
      <footer class="bg-gray-1000 h-[300px] pt-10"></footer>
    </div>
  )
}

function AppErrorBoundary(props: ParentProps) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line solid/components-return-once
    return <>{props.children}</>
  } else {
    // eslint-disable-next-line solid/components-return-once
    return (
      <ErrorBoundary fallback={(e: Error) => <ErrorPage msg={e.stack} />}>
        {props.children}
      </ErrorBoundary>
    )
  }
}

import { Title, Style } from "@solidjs/meta"
import { Router } from "@solidjs/router"
import { createMemo, ErrorBoundary, type ParentProps, Show } from "solid-js"
import { Header } from "~/components/header/index.tsx"
import ErrorPage from "./route/500.tsx"
import { useI18N } from "./state/i18n"
import { Providers } from "./state"

export default function App() {
  return (
    <>
      <Providers>
        <Routes />
      </Providers>
      {/* <Providers>
        <Routes />
      </Providers> */}
    </>
  )
}

function Routes() {
  return (
    <div class="text-black">hello world</div>
    // <Router root={(props) => <Layout {...props} />}>
    //   <CustomErrorBoundary>
    //     <div class="text-black">hello world</div>
    //   </CustomErrorBoundary>
    // </Router>
  )
}

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
    <div class="flex min-h-full flex-col">
      <Title>Doujin Cloud DB</Title>
      {/* <Header /> */}
      <div class="grow border-t">{props.children}</div>
      <footer class="bg-gray-1000 h-[300px] pt-10"></footer>
    </div>
  )
}

function CustomErrorBoundary(props: ParentProps) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line solid/components-return-once
    return <>{props.children}</>
  } else {
    // eslint-disable-next-line solid/components-return-once
    return (
      <ErrorBoundary
        fallback={(e: Error) => (
          <>
            <ErrorPage msg={e.stack} />
          </>
        )}
      >
        {props.children}
      </ErrorBoundary>
    )
  }
}

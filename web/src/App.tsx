import { createRouter, RouterProvider } from "@tanstack/solid-router"

import { routeTree } from "./routeTree.gen"
import { StateProvider } from "./state"

const router = createRouter({ routeTree })

declare module "@tanstack/solid-router" {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <StateProvider>
      <Routes />
    </StateProvider>
  )
}

function Routes() {
  return <RouterProvider router={router} />
}

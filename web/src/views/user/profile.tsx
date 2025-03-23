import { createQuery } from "@tanstack/solid-query"
import { Link, Navigate, useNavigate, useParams } from "@tanstack/solid-router"
import { Match, Show, Switch } from "solid-js"
import { Button } from "~/components/button"
import { FetchClient } from "~/query"
import { useUserCtx } from "~/state/user"

export function Profile() {
  let params = useParams({ strict: false })()
  let nav = useNavigate()
  let current_user = useUserCtx().user
  let query_result = createQuery(() => ({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ["profile", params.username ?? current_user?.name].filter(
      Boolean,
    ),
    queryFn: async () => {
      if (current_user) {
        return current_user
      }

      let res = await (params.username ?
        FetchClient.GET(`/profile/{name}`, {
          params: {
            path: {
              name: params.username,
            },
          },
        })
      : FetchClient.GET(`/profile`))

      if (res.data) {
        return res.data.data
      } else if (res.error) {
        throw res.error.message
      } else if (res.response.status === 404) {
        return nav({ to: "/" })
      } else {
        throw Error("Unknown error")
      }
    },
    throwOnError: true,
  }))

  return (
    <Switch>
      <Match when={query_result.isLoading}>
        <div>Loading...</div>
      </Match>
      <Match when={!query_result.isLoading}>
        <Show
          when={query_result.data}
          // TODO: Nav to sign in
          fallback={<Navigate to="/" />}
        >
          {(user) => (
            <>
              <div>{JSON.stringify(user())}</div>
              <Button variant="Primary">
                <Link
                  to="/profile/$username"
                  params={{ username: "huli" }}
                >
                  huli
                </Link>
              </Button>
              <Button variant="Primary">
                <Link
                  to="/profile/$username"
                  params={{ username: "Admin" }}
                >
                  Admin
                </Link>
              </Button>
              <Button variant="Primary">
                <Link to="/profile">None</Link>
              </Button>
            </>
          )}
        </Show>
      </Match>
    </Switch>
  )
}

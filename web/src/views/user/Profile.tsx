import { Link, useParams } from "@tanstack/solid-router"
import { Match, Show, Switch } from "solid-js"
import { PageLayout } from "~/components/layout/PageLayout"
import { userProfileQuery } from "~/data/user"
import { useUserCtx } from "~/state/user"

export function Profile() {
  let params = useParams({ strict: false })()
  let query_result = userProfileQuery({ "params.username": params.username })

  return (
    <PageLayout>
      <Switch>
        <Match when={query_result.isLoading}>
          <div>Loading...</div>
        </Match>
        <Match when={query_result.data}>
          {(user) => (
            <div class="flex justify-between">
              <div>
                <div>{user().name}</div>
                <div>{user().last_login}</div>
                <div>{user().roles}</div>
              </div>
              <Show when={useUserCtx().is_signed_in}>
                <EditBtn />
              </Show>
            </div>
          )}
        </Match>
      </Switch>
    </PageLayout>
  )
}

function EditBtn() {
  return (
    <div>
      <Link to="/profile/edit">Edit</Link>
    </div>
  )
}

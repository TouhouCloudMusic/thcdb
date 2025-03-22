import { Title } from "@solidjs/meta"
import { createFileRoute, Link } from "@tanstack/solid-router"
import Cookies from "js-cookie"
import { Button } from "~/components/button"
import { use_user_ctx } from "~/state/user"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  let user_ctx = use_user_ctx()
  return (
    <div class="flex justify-center">
      <div class="w-[60rem]">
        <Title>Hello World</Title>
        <ul class="my-2 flex flex-col gap-2">
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/profile">Profile</Link>
          </li>
          <Button
            // eslint-disable-next-line solid/reactivity
            onClick={async () => {
              await user_ctx.sign_out()
            }}
          >
            Sign Out
          </Button>
        </ul>
      </div>
    </div>
  )
}

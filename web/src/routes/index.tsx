import { Title } from "@solidjs/meta"
import { createFileRoute, Link } from "@tanstack/solid-router"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
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
        </ul>
      </div>
    </div>
  )
}

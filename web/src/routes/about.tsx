import { Title } from "@solidjs/meta"
import { createFileRoute } from "@tanstack/solid-router"

export const Route = createFileRoute("/about")({
  component: About,
})

function About() {
  return (
    <>
      <Title>About</Title>
      <h1>About</h1>
    </>
  )
}

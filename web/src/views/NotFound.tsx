import { Title } from "@solidjs/meta"

export function NotFound() {
  return (
    <div class="size-full py-32 flex">
      <Title>404 Not Found</Title>
      <img
        class="w-3/4 m-auto"
        src="/img/status_code/404.png"
        alt="404 Not Found"
      />
    </div>
  )
}

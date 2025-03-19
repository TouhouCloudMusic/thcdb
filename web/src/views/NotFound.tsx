import { Title } from "@solidjs/meta"

export function NotFound() {
  return (
    <div class="w-[64rem] py-32">
      <Title>Not Found</Title>
      <img
        src="/img/status_code/404.png"
        alt="404 Not Found"
      />
    </div>
  )
}

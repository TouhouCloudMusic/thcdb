import { Title } from "@solidjs/meta"

export function SiteTitle(props: { children: string[] | string }) {
  return <Title>{props.children} - Doujin Cloud DB</Title>
}

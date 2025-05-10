import { type ComponentProps, type ParentProps } from "solid-js"

export type FormLayoutProps = ParentProps<ComponentProps<"div">>

export function FormLayout(props: FormLayoutProps) {
  return <div class="w-full bg-primary">{props.children}</div>
}

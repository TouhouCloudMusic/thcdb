import { createMemo, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"
import { Legend } from "./base.tsx"

export const FieldSet = (
  props: JSX.FieldsetHTMLAttributes<HTMLFieldSetElement>,
) => {
  const className = createMemo(() =>
    props.class ? twMerge(FieldSet.className, props.class) : FieldSet.className,
  )

  return (
    <fieldset
      {...props}
      class={className()}
    ></fieldset>
  )
}
// @tw
FieldSet.className = "border-b border-slate-300 pb-12"
FieldSet.Legend = Legend

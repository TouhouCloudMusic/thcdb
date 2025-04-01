import { type ComponentProps, mergeProps, type ParentProps } from "solid-js"
import { twMerge } from "tailwind-merge"

export function PageLayout(props: ParentProps<ComponentProps<"div">>) {
  const CLASS = `
    grid grid-cols-24
    h-full w-2/3 max-w-5xl
    mx-auto
    border-x-1 border-gray-300`
  let final_props = mergeProps(props, {
    get class() {
      return twMerge(CLASS, props.class)
    },
  })

  return <div {...final_props}></div>
}

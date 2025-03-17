import { splitProps, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

export type Props = {
  direction: Direction
} & JSX.HTMLAttributes<HTMLSpanElement>

export const enum Direction {
  Vertical,
  Horizonal,
}

export function Divider(props: Props) {
  let direction_class = () => {
    switch (props.direction) {
      case Direction.Vertical:
        return "w-[0.5px] h-full"
      case Direction.Horizonal:
        return "h-[0.5px] w-full"
    }
  }

  let [_, other_props] = splitProps(props, ["class"])

  return (
    <span
      class={twMerge("bg-slate-300", direction_class(), props.class)}
      {...other_props}
    ></span>
  )
}

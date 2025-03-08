import { twMerge } from "tailwind-merge"

export type Props = {
  class?: string | undefined
  direction: Direction
}

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

  return (
    <span
      class={twMerge("bg-slate-300", direction_class(), props.class)}
    ></span>
  )
}

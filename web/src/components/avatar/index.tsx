import { createSignal, type JSX, Show, splitProps } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type UserProfile } from "~/model/user"

export interface Props
  extends Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  user?: UserProfile | undefined
}

export function Avatar(props: Props) {
  let [error, set_error] = createSignal(false)

  let [_, other_props] = splitProps(props, ["class", "user"])

  return (
    <div class={twMerge("size-8 rounded-full overflow-hidden", props.class)}>
      <Show
        when={!error()}
        fallback={
          <div class="size-full flex items-center justify-center bg-gray-200">
            <span class="text-gray-500">
              {props.user?.name[0]?.toUpperCase() ?? "N/A"}
            </span>
          </div>
        }
      >
        <img
          {...other_props}
          src={props.user?.avatar_url ?? ""}
          alt={props.alt ?? "avatar"}
          onError={() => {
            set_error(true)
          }}
          class="object-cover size-full"
        />
      </Show>
    </div>
  )
}

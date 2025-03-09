import { createSignal, Show, splitProps, type JSX } from "solid-js"
import { twMerge } from "tailwind-merge"
import { type User } from "~/state/user"

export interface Props
  extends Omit<JSX.ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> {
  user?: User | undefined
}

export function Avatar(props: Props) {
  let handle_error = () => {
    set_error(true)
  }

  let [error, set_error] = createSignal(false)

  let [_, other_props] = splitProps(props, ["class", "user"])

  return (
    <div
      class={twMerge(
        "inline-block size-8 rounded-full overflow-hidden cursor-pointer",
        props.class,
      )}
    >
      <Show
        when={!error()}
        fallback={
          <div class="size-full flex items-center justify-center bg-gray-200">
            <span class="text-sm text-gray-500">
              {props.user?.name[0]?.toUpperCase() ?? "N/A"}
            </span>
          </div>
        }
      >
        <img
          {...other_props}
          src={props.user?.avatar_url}
          alt={props.alt ?? "avatar"}
          onError={handle_error}
          class="object-cover size-full"
        />
      </Show>
    </div>
  )
}

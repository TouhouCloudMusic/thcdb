import { For } from "solid-js"
import { RatingStatic } from "~/components/static_rating"

import { useSongData } from "../store"

export function ReviewComp() {
  const { reviews } = useSongData()
  return (
    <div class="w-full">
      <h3>Reviews</h3>
      <div class="flex rounded-xs bg-gray-200/75 px-2 text-sm">
        <span class="font-bold">Sort by: </span>
        <ul class="flex divide-x-2 divide-gray-400/85">
          <li class="px-1">date</li>
          <li class="px-1">length</li>
          <li class="px-1">votes</li>
          <li class="px-1">hot</li>
        </ul>
      </div>
      <ul class="my-1.5">
        <For each={reviews()}>
          {(review) => (
            <li>
              <article>
                <div class="flex justify-between rounded-md bg-gray-200/75">
                  <div class="flex items-center">
                    <div class="flex size-8 rounded-md bg-gray-300/80">
                      <div class="m-auto size-fit text-xs text-gray-500">
                        头像
                      </div>
                    </div>
                    <p>
                      <a
                        href="user/[id]"
                        class="mx-2"
                      >
                        {review.author}
                      </a>
                    </p>
                    <p class="mx-2">
                      <time
                        class="text-sm font-medium text-gray-600 italic"
                        datetime={review.date}
                      >
                        {review.date}
                      </time>
                    </p>
                  </div>
                  <div class="flex items-center">
                    <div class="mx-2">+</div>
                    <div class="mx-2">-</div>
                    <div class="mx-2">
                      <RatingStatic rating={review.rating} />
                    </div>
                  </div>
                </div>
                <p class="my-2 pl-4 text-gray-600">{review.content}</p>
              </article>
            </li>
          )}
        </For>
      </ul>
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Index, Match, Switch } from "solid-js"

import { useUserController } from "../store"
import type { ReviewAction } from "../user"

export default function TimelineList() {
  const userData = useUserController()
  return (
    <ul class="flex flex-col-reverse">
      <Index each={userData.timeline()}>
        {(item) => (
          <li class="border-sm my-1 rounded-sm border-gray-300 px-3 py-2">
            <div class="my-2 flex justify-between pr-2">
              <div class="size-9 place-content-center rounded-full bg-gray-400 text-center text-sm text-white">
                <a
                  href={`/user/${item().user.id}`}
                  class=""
                >
                  头像
                </a>
              </div>
              <p class="self-center text-sm text-gray-600 italic">
                <time datetime={item().time}>{item().time}</time>
              </p>
            </div>

            <Switch>
              <Match when={item().action_type === "review"}>
                <p class="my-2 ml-1">
                  {/* <a href={`user/${item().user.id}`}>
										{userData.username}
									</a>{" "} */}
                  <span class="italic">Reviewed</span>{" "}
                </p>
                <div>
                  <div class="my-2 flex items-center pl-8">
                    <div class="size-9 place-content-center rounded-sm bg-gray-400 text-center text-sm text-white">
                      <a
                        href={`/${item().target_type}/${item().target_id}`}
                        class=""
                      >
                        封面
                      </a>
                    </div>
                    <p class="mx-2 text-sm text-gray-600 italic">
                      <a
                        href={`/${item().target_type}/${item().target_id}`}
                        class="blue_link"
                      >
                        {(item() as ReviewAction).target_data.title}
                      </a>
                    </p>
                  </div>
                </div>
              </Match>
            </Switch>
            {/* <div class="flex place-content-end">
							<ul class="flex ">
								<li class="mx-1">评论</li>
								<li class="mx-1">点赞</li>
								<li class="mx-1">转发</li>
							</ul>
						</div> */}
          </li>
        )}
      </Index>
    </ul>
  )
}

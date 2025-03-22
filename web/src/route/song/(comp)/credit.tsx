import { Index } from "solid-js"

import { useSongData } from "../controller"

const roleListClass = "flex flex-wrap my-0.5 text-sm"
export function CreditComp() {
  const { credits } = useSongData()
  return (
    <>
      <h3>Credits</h3>
      <ul class="my-1 flex flex-col py-1 pl-1">
        <Index each={credits()}>
          {(artist) => (
            <li>
              <a href="/artist/[id]">{artist().name}</a>
              <ul class={roleListClass}>
                <Index each={artist().role}>
                  {(role, index) => (
                    <li>
                      <a
                        href={"/role/" + role()}
                        class="text-gray-600"
                      >
                        {role()}
                      </a>
                      {index !== role.length - 1 ? ", " : ""}
                    </li>
                  )}
                </Index>
              </ul>
            </li>
          )}
        </Index>
      </ul>
    </>
  )
}

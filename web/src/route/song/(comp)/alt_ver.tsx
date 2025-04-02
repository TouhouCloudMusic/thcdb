import style from "../song_page.module.css"
import { useSongData } from "../store"

export function AltVerComp() {
  const { altVers } = useSongData()

  const AltVerList = () =>
    altVers().map((version) => {
      return (
        <>
          <li
            class={
              style["altVerItem"] +
              " mx-2 my-1 flex justify-between bg-white p-2 py-3"
            }
          >
            <div>
              <a href="/release/[id]">{version.title} </a>in{" "}
              <a href="/release/[id]">{version.album}</a> -{" "}
              <a href="/artist/[id]">{version.albumArtist}</a>
            </div>
            <p class="text-gray-500">{version.type}</p>
          </li>
        </>
      )
    })

  return (
    <div class="w-full">
      <div class="my-1.5 flex w-auto items-baseline justify-between">
        <h3>Alternative Version</h3>
        <p class="gray-link-sm">view main song</p>
      </div>
      <ul
        class={`${style["altVerWrapper"]} flex w-auto flex-col flex-nowrap bg-gray-200 pt-1`}
      >
        <AltVerList />
        <div
          class={`${style["altVerBottomButton"]} mt-1.5 items-center bg-blue-500 p-0 text-center hover:bg-blue-600`}
        >
          <button class="my-1 text-white">Show All</button>
        </div>
      </ul>
    </div>
  )
}

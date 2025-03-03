import { autoUpdate, offset, shift } from "@floating-ui/dom"
import { useFloating } from "solid-floating-ui"
import { Index, Show, createSignal } from "solid-js"
import { ShowPortal } from "~/util/ShowPortal"
import { useSongData } from "../controller"
import style from "../song_page.module.css"
import { VoteGenreTab } from "./vote_genre_tab"
export function SongInfo() {
  const { artist, duration, originalSong, ratings, rank, genres } =
    useSongData()
  const [anchor, anchorRef] = createSignal<HTMLElement>()
  const [voteTab, voteTabRef] = createSignal<HTMLElement>()
  const [show, setShow] = createSignal(false)
  const position = useFloating(anchor, voteTab, {
    placement: "bottom",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset({
        mainAxis: -150,
      }),
      shift({ crossAxis: true, mainAxis: true }),
    ],
  })
  const voteTabAttributes = {
    voteTabRef: voteTabRef,
    position: position,
    setShow: setShow,
  }
  return (
    <div
      ref={anchorRef}
      class={"my-1 grid grid-flow-row gap-1 px-1.5 pt-1 text-gray-900"}
    >
      <ShowPortal when={show()}>
        <VoteGenreTab {...voteTabAttributes} />
      </ShowPortal>
      <div class={style["infoRow"]}>
        <p class="">Artist</p>
        <p>
          <a href="artist/[id]">{artist()}</a>
        </p>
      </div>
      <div class={style["infoRow"]}>
        <p class="">Duration</p>
        <p>{duration()}</p>
      </div>
      <Show when={originalSong()}>
        {" "}
        <div class={style["infoRow"]}>
          <p class="">Original Song</p>
          <ul class="">
            <Index each={originalSong()}>
              {(song, index) => (
                <li>
                  <p>
                    <a href="song/[id]">{song()}</a>
                    {index !== originalSong().length - 1 ? ", " : ""}
                  </p>
                </li>
              )}
            </Index>
          </ul>
        </div>
      </Show>
      <div class={style["infoRow"]}>
        <p>Ratings</p>
        <p>
          {ratings.value()} / 5.00 from {ratings.count()} ratings
        </p>
      </div>
      <div class={style["infoRow"]}>
        <p>Ranked</p>
        <p>
          #{rank.thisYear()} for <a href="rank?time=2024">2024</a>, #
          {rank.overAll()} <a href="rank?time=all">overall</a>
        </p>
      </div>
      <div class={style["infoRow"]}>
        <p>Genres</p>
        <ul class="flex content-center">
          <Show
            when={false}
            fallback={<p class="text-sm text-gray-400">null</p>}
          >
            <Index each={genres()}>
              {(genre, index) => (
                <li class="">
                  <a href="genre/[id]">{genre()}</a>
                  {index !== genres().length - 1 ? ", " : ""}
                </li>
              )}
            </Index>
          </Show>
        </ul>
        <p>
          <button
            onClick={() => setShow(true)}
            class={style["vote"]}
          >
            vote
          </button>
        </p>
      </div>
      <div class={style["infoRow"]}>
        <p>Descriptors</p>
        <ul class="flex">
          <li class="">
            <a href="descriptor/[id]">Descriptor A</a>
            {", "}
          </li>
          <li>
            <a href="descriptor/[id]">Descriptor B</a>
          </li>
        </ul>
        <p>
          <button
            onClick={() => setShow(true)}
            class={style["vote"]}
          >
            vote
          </button>
        </p>
      </div>
    </div>
  )
}

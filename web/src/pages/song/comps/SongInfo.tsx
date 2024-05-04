import { autoUpdate, offset, shift } from "@floating-ui/dom"
import { useFloating } from "solid-floating-ui"
import { Index, createSignal } from "solid-js"
import { VoteGenreTab } from "./VoteGenreTab"
import { useSongState } from "../song.state"
import { ShowPortal } from "~/utils/ShowPortal"

export function SongInfo() {
	const { artist, duration, originalSong, ratings, rank, genres } =
		useSongState()
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
			class={"my-1 grid grid-flow-row gap-1 px-1.5 pt-1 text-zinc-900 "}>
			<ShowPortal when={show()}>
				<VoteGenreTab {...voteTabAttributes} />
			</ShowPortal>
			<div class="infoRow">
				<p class="">Artist</p>
				<p>
					<a href="">{artist()}ShowPortal</a>
				</p>
			</div>
			<div class="infoRow">
				<p class="">Duration</p>
				<p>{duration()}</p>
			</div>
			<div class="infoRow">
				<p class="">Original Song</p>
				<ul class="">
					<Index each={originalSong()}>
						{(song, index) => (
							<li>
								<p>
									<a href="">{song()}</a>
									{index !== originalSong().length - 1
										? ", "
										: ""}
								</p>
							</li>
						)}
					</Index>
				</ul>
			</div>
			<div class="infoRow">
				<p>Ratings</p>
				<p>
					{ratings.value()} / 5.00 from {ratings.count()} ratings
				</p>
			</div>
			<div class="infoRow">
				<p>Ranked</p>
				<p>
					#{rank.thisYear()} for <a href="">2024</a>, #
					{rank.overAll()} <a href="">overall</a>
				</p>
			</div>
			<div class="infoRow">
				<p>Genres</p>
				<ul class="flex">
					<Index each={genres()}>
						{(genre, index) => (
							<li class="">
								<a href="">{genre()}</a>
								{index !== genres().length - 1 ? ", " : ""}
							</li>
						)}
					</Index>
				</ul>
				<p>
					<button
						onClick={() => setShow(true)}
						class="vote">
						vote
					</button>
				</p>
			</div>
			<div class="infoRow">
				<p>Descriptors</p>
				<ul class="flex">
					<li class="">
						<a href="">Descriptor A</a>
						{", "}
					</li>
					<li>
						<a href="">Descriptor B</a>
					</li>
				</ul>
				<p>
					<button
						onClick={() => setShow(true)}
						class="vote">
						vote
					</button>
				</p>
			</div>
		</div>
	)
}

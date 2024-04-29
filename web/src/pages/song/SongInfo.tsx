import { autoUpdate, offset, shift } from "@floating-ui/dom";
import { useFloating } from "solid-floating-ui";
import { Show, createSignal } from "solid-js";
import { VoteGenreTab } from "./VoteGenreTab";

const infoSubItemClass = "grid grid-cols-3 gap-1";

export function SongInfo() {
	const [anchor, anchorRef] = createSignal<HTMLElement>();
	const [voteTab, voteTabRef] = createSignal<HTMLElement>();
	const [show, setShow] = createSignal(true);
	const position = useFloating(anchor, voteTab, {
		placement: "bottom",
		whileElementsMounted: autoUpdate,
		middleware: [
			offset({
				mainAxis: -150,
			}),
			shift({ crossAxis: true, mainAxis: true }),
		],
	});
	// const position = useFloating(
	// 	() => ({
	// 		getBoundingClientRect() {
	// 			return {
	// 				x: 0,
	// 				y: 0,
	// 				top: 100,
	// 				left: 950,
	// 				bottom: 0,
	// 				right: 0,
	// 				width: 0,
	// 				height: 0,
	// 			};
	// 		},
	// 		// contextElement: trigger(),
	// 	}),
	// 	voteTab,
	// 	{
	// 		// whileElementsMounted: autoUpdate,
	// 		middleware: [
	// 			// offset({
	// 			// 	mainAxis: -150,
	// 			// }),
	// 			shift({ crossAxis: true, mainAxis: true }),
	// 		],
	// 	}
	// );
	const voteTabAttributes = {
		voteTabRef: voteTabRef,
		position: position,
		setShow: setShow,
	};
	return (
		<div
			ref={anchorRef}
			class={"my-1 grid grid-flow-row gap-1 px-1.5 pt-1 text-zinc-900 "}>
			<Show when={show()}>
				<VoteGenreTab {...voteTabAttributes} />
			</Show>
			<div class={infoSubItemClass}>
				<p class="">Artist</p>
				<p>
					<a href="">Song Artist</a>
				</p>
			</div>
			<div class={infoSubItemClass}>
				<p class="">Duration</p>
				<p>23:33</p>
			</div>
			<div class={infoSubItemClass}>
				<p class="">Original Song</p>
				<ul class="flex">
					<li>
						<p>
							<a href="">Song A</a>,{" "}
						</p>
					</li>
					<li>
						<a href="">Song B</a>,{" "}
					</li>
					<li>
						<a href="">Song C</a>
					</li>
				</ul>
			</div>
			<div class={infoSubItemClass}>
				<p>Ratings</p>
				<p>4.00 / 5.00 from 114 ratings</p>
			</div>
			<div class={infoSubItemClass}>
				<p>Ranked</p>
				<p>
					#1 for <a href="">2024</a>, #1 <a href="">overall</a>
				</p>
			</div>
			<div class={infoSubItemClass}>
				<p>Genres</p>
				<ul class="flex">
					<li class="">
						<a href="">Genre A</a>
						{", "}
					</li>
					<li>
						<a href="">Genre B</a>
					</li>
				</ul>
				<p>
					<button
						onClick={() => setShow(true)}
						class="text-zinc-400">
						vote
					</button>
				</p>
			</div>
			<div class={infoSubItemClass}>
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
				<a>vote</a>
			</div>
		</div>
	);
}

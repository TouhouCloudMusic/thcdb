import { Title } from "@solidjs/meta";
import "./style.css";
import { EditComp } from "./comps/EditComp";
import { UserActionComp } from "./comps/UserActionComp";
import { AltVerComp } from "./comps/AltVerComp";
import { ReviewComp } from "./comps/ReviewComp";
import { SongInfo } from "./comps/SongInfo";
import { CreditComp } from "./comps/CreditComp";
import { SongStateProvider, useSongState } from "./state";
import { testSongData } from "./testDatas";
import { createMemo, onMount } from "solid-js";
import { createStore } from "solid-js/store";

// const [altVers] = createSignal(altVersTest);
const divideClass = "divide-y-2 divide-zinc-400 w-full";

function SongPage() {
	const { title } = useSongState();
	return (
		<main class="items-center justify-center gap-1">
			{/* TODO: title 移至 appState */}
			<Title>{title()}</Title>
			<div class={divideClass}>
				<div class="flex items-baseline justify-between">
					<h3 class="">{title()}</h3>
					<EditComp />
				</div>
				<SongInfo />
			</div>
			<div class="w-full items-start justify-start">
				<UserActionComp />
			</div>
			<AltVerComp />
			<div class={divideClass}>
				<CreditComp />
			</div>
			<ReviewComp />
		</main>
	);
}

export default function () {
	return (
		<SongStateProvider data={testSongData}>
			<SongPage />
		</SongStateProvider>
	);
}

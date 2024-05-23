import { Title } from "@solidjs/meta"
import { EditComp } from "./comps/EditComp"
import { UserActionComp } from "./comps/UserActionComp"
import { AltVerComp } from "./comps/AltVerComp"
import { ReviewComp } from "./comps/ReviewComp"
import { SongInfo } from "./comps/SongInfo"
import { CreditComp } from "./comps/CreditComp"
import { SongDataProvider, useSongData } from "./song.state"
import { testSongData } from "./test.data"
// import "./song_page.css"
const divideClass = "divide-y-2 divide-gray-400 w-full"

function SongPage() {
	const { title } = useSongData()
	return (
		<main>
			<div class="mt-0 flex flex-col items-center justify-center gap-1 ">
				{" "}
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
			</div>
		</main>
	)
}

export default function () {
	return (
		<SongDataProvider defaultState={testSongData}>
			<SongPage />
		</SongDataProvider>
	)
}

import { Title } from "@solidjs/meta";
import "./style.css";
import { EditComp } from "./EditComp";
import { UserActionComp } from "./UserActionComp";
import { AltVerComp } from "./AltVerComp";
import { ReviewComp } from "./ReviewComp";
import { SongInfo } from "./SongInfo";

type altVer = {
	title: string;
	album: string;
	albumArtist: string;
	type: string;
};
function versionGenerator(index: number) {
	const arr = [];
	const typeEnum = ["remixed", "remastered", "re-recorded", "common"];
	for (let i = 0; i < index; i++) {
		arr.push({
			title: "Alt Ver " + (i + 1),
			album: "Alt Album " + (i + 1),
			albumArtist: "Alt Artist " + (i + 1),
			type: typeEnum[(i + typeEnum.length) % typeEnum.length],
		});
	}
	return arr;
}
export const altVersTest: altVer[] = versionGenerator(4);
// const [altVers] = createSignal(altVersTest);
const divClassDivide = "divide-y-2 divide-zinc-400 w-full";
export const grayLinkClass = "text-sm text-gray-600 hover:text-gray-600/70";

const creditRoleClass = "flex flex-wrap my-0.5 text-sm";
export default function SongPage() {
	return (
		<>
			<main class="relative items-center justify-center gap-1">
				<Title>Lovelight - Alstromeria Records</Title>

				<div class={divClassDivide + ""}>
					<div class="flex items-baseline justify-between">
						<h3 class="">Song Title</h3>

						<EditComp />
					</div>
					<SongInfo />
				</div>
				<div class="w-full items-start justify-start">
					<UserActionComp />
				</div>
				<div class="w-full">
					<AltVerComp />
				</div>
				<div class={divClassDivide}>
					<h3>Credits</h3>
					<ul class="my-1 flex flex-col py-1 pl-1">
						<li>
							<a href="">Some Artist</a>
							<ul class={creditRoleClass}>
								<li>
									<a
										href=""
										class="text-gray-600">
										Some Role
									</a>
									,&nbsp
								</li>
								<li>
									<a
										href=""
										class="text-gray-600">
										Some Other Role
									</a>
									,&nbsp
								</li>
								<li>
									<a
										href=""
										class="text-gray-600">
										And Some Role
									</a>
								</li>
							</ul>
						</li>
						<li>
							<a href="">Another Artist</a>
							<ul class={creditRoleClass}>
								<li>
									<a
										href=""
										class="text-gray-600">
										Some Role
									</a>
									,&nbsp
								</li>
								<li>
									<a
										href=""
										class="text-gray-600">
										Some Other Role
									</a>
									,&nbsp
								</li>
								<li>
									<a
										href=""
										class="text-gray-600">
										And Some Role
									</a>
								</li>
							</ul>
						</li>
					</ul>
				</div>
				<ReviewComp />
			</main>
		</>
	);
}

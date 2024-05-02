import { JSX, createContext, createMemo, useContext } from "solid-js";
import { SetStoreFunction, createStore } from "solid-js/store";
import { versionGenerator, testCreditData } from "./testDatas";
import { reviewGenerator } from "./testDatas";
import { createProvider } from "~/utils/createProvider";

export interface AltVer {
	title: string;
	album: string;
	albumArtist: string;
	type: ALT_VER_TYPES;
}

export enum ALT_VER_TYPES {
	"remixed",
	"remastered",
	"re-recorded",
	"common"
}

interface SongCredit {
	name: string;
	role: string[];
}

export interface SongReview {
	author: string;
	date: string;
	content: string;
	rating: number;
}

interface SongData {
	title: string;
	altVers: AltVer[];
	credits: SongCredit[];
	reviews: SongReview[];
}

interface SongController {
	title: () => string;
	setTitle(value: string): void;
	altVers: () => AltVer[];
	setAltVer(value: AltVer[]): void;
	credits: () => SongCredit[];
	reviews: () => SongReview[];
}

// const Context = createContext();
// export function SongStateProvider(props: {
// 	children: JSX.Element;
// 	data: SongData;
// }) {
// 	const [state, setState] = createStore(props.data);
// 	const songController: SongController = {
// 		title: () => state.title,
// 		setTitle(value: string) {
// 			setState("title", value);
// 		},
// 		altVers: () => state.altVers,
// 		setAlterVer(value: AltVer[]) {
// 			setState("altVers", value);
// 		},
// 		credits: () => state.credits,
// 		reviews: () => state.reviews
// 	};
// 	return (
// 		<Context.Provider value={songController}>
// 			{props.children}
// 		</Context.Provider>
// 	);
// }

// const [state, setState] = createStore<SongData>();

function createSongController(
	state: SongData,
	setState: SetStoreFunction<SongData>
) {
	const songController: SongController = {
		title: () => state.title,
		setTitle(value: string) {
			setState("title", value);
		},
		altVers: () => state.altVers,
		setAltVer(value: AltVer[]) {
			setState("altVers", value);
		},
		credits: () => state.credits,
		reviews: () => state.reviews
	};
	return songController;
}

export const [SongStateProvider, useSongState] = createProvider<
	SongData,
	SongController
>(createSongController);

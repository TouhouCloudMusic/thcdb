import { SongData, SongReview } from "./song.state"
import { AltVer, ALT_VER_TYPES } from "./song.state"

function versionGenerator(index: number): AltVer[] {
	const arr: AltVer[] = []
	for (let i = 0; i < index; i++) {
		arr.push({
			title: "Alt Ver " + (i + 1),
			album: "Alt Album " + (i + 1),
			albumArtist: "Alt Artist " + (i + 1),
			type: ALT_VER_TYPES[
				i % Object.keys(ALT_VER_TYPES).length
			] as unknown as ALT_VER_TYPES,
		})
	}
	return arr
}

const testCreditData = [
	{
		name: "Artist A",
		role: ["Role A", "Role B", "Role C"],
	},
	{
		name: "Artist B",
		role: ["Role C", "Role D", "Role E"],
	},
]

function reviewGenerator(times: number) {
	const arr: SongReview[] = []
	for (let i = 0; i < times; i++) {
		arr.push({
			author: "Author " + (i + 1),
			date: "2020-01-0" + (i + 1),
			content: `Lorem ipsum dolor sit amet consectetur adipisicing elit. Explicabo unde delectus maxime, iure illum quam iusto aut tempore! Quae ab suscipit id, amet tempora eum quibusdam veritatis nobis corrupti beatae?`,
			rating: 4 - i,
		})
	}
	return arr
}

export const testSongData: SongData = {
	title: "Test Song",
	altVers: versionGenerator(4),
	credits: testCreditData,
	reviews: reviewGenerator(3),
	artist: "Test Artist",
	duration: "23:33",
	originalSong: ["Original Song A", "Original Song B", "Original Song C"],
	ratings: {
		value: 4.15,
		count: 114,
	},
	rank: {
		thisYear: 1,
		overAll: 1,
	},
	genres: ["Genre A", "Genre B", "Genre C"],
	descriptors: ["Descriptor A", "Descriptor B", "Descriptor C"],
}

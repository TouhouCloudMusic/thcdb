import type {
	ArtistSongCredit,
	ArtistSongCreditRelease,
	CreditRoleRef,
} from "~/hey-api"

const trackCollator = new Intl.Collator(undefined, { numeric: true })
const numericTrackNumber = /^(?:0|[1-9]\d*)$/u

type Disc = Exclude<ArtistSongCreditRelease["disc"], undefined>

type RoleTrack = {
	disc: Disc
	trackNumber: string
}

type PreparedSong = {
	song: ArtistSongCredit
	tracks: ArtistSongCreditRelease[]
}

type SongRoleGroup = {
	role: CreditRoleRef | undefined
	tracks: Map<string, RoleTrack>
}

export type CreditRange = {
	disc: Disc
	start: string
	end: string
}

export type CreditRangeGroup = {
	range: CreditRange
	roles: CreditRoleRef[]
}

function compareDiscs(a?: Disc, b?: Disc) {
	if (a === b) return 0
	if (a == null) return -1
	if (b == null) return 1
	return a.index - b.index
}

function compareTracks(a: ArtistSongCreditRelease, b: ArtistSongCreditRelease) {
	const discOrder = compareDiscs(a.disc, b.disc)
	if (discOrder !== 0) return discOrder
	if (a.track_number == null) return b.track_number == null ? 0 : 1
	if (b.track_number == null) return -1
	return trackCollator.compare(a.track_number, b.track_number)
}

function compareSongs(a: PreparedSong, b: PreparedSong) {
	const aTrack = a.tracks[0]
	const bTrack = b.tracks[0]
	if (aTrack && bTrack) {
		const order = compareTracks(aTrack, bTrack)
		if (order !== 0) return order
	}
	return (
		trackCollator.compare(a.song.title, b.song.title)
		|| a.song.song_id - b.song.song_id
	)
}

function groupSongsByRole(songs: PreparedSong[]) {
	const groups = new Map<number | undefined, SongRoleGroup>()

	for (const [index, item] of songs.entries()) {
		const roles = item.song.roles.length > 0 ? item.song.roles : [undefined]
		const tracks =
			item.tracks.length > 0
				? item.tracks.map((track) => ({
						disc: track.disc ?? null,
						trackNumber: track.track_number ?? String(index + 1),
					}))
				: [{ disc: null, trackNumber: String(index + 1) }]

		for (const role of roles) {
			let group = groups.get(role?.id)
			if (!group) {
				group = { role, tracks: new Map() }
				groups.set(role?.id, group)
			}
			for (const track of tracks) {
				const key = JSON.stringify([
					track.disc?.index ?? null,
					track.trackNumber,
				])
				group.tracks.set(key, track)
			}
		}
	}

	return groups.values()
}

function compareRoleTracks(a: RoleTrack, b: RoleTrack) {
	return (
		compareDiscs(a.disc, b.disc)
		|| trackCollator.compare(a.trackNumber, b.trackNumber)
	)
}

function rangesForTracks(tracks: Iterable<RoleTrack>) {
	const ranges: CreditRange[] = []

	for (const track of [...tracks].sort(compareRoleTracks)) {
		const previous = ranges.at(-1)
		if (
			previous
			&& previous.disc?.index === track.disc?.index
			&& numericTrackNumber.test(previous.end)
			&& numericTrackNumber.test(track.trackNumber)
			&& Number(track.trackNumber) === Number(previous.end) + 1
		) {
			previous.end = track.trackNumber
		} else {
			ranges.push({
				disc: track.disc,
				start: track.trackNumber,
				end: track.trackNumber,
			})
		}
	}

	return ranges
}

export function groupCreditRanges(
	songs: ArtistSongCredit[],
	releaseId: number,
): CreditRangeGroup[] {
	const preparedSongs = songs
		.filter((song) => song.primary_release_id === releaseId)
		.map((song) => ({
			song,
			tracks: song.releases
				.filter((release) => release.release_id === releaseId)
				.toSorted(compareTracks),
		}))
		.toSorted(compareSongs)
	const groups = new Map<string, CreditRangeGroup>()

	for (const roleGroup of groupSongsByRole(preparedSongs)) {
		for (const range of rangesForTracks(roleGroup.tracks.values())) {
			const key = JSON.stringify([
				range.disc?.index ?? null,
				range.start,
				range.end,
			])
			const group = groups.get(key)
			if (group) {
				if (roleGroup.role) {
					group.roles.push(roleGroup.role)
				}
				continue
			}
			groups.set(key, {
				range,
				roles: roleGroup.role ? [roleGroup.role] : [],
			})
		}
	}

	return [...groups.values()]
}

export function formatCreditRange(range: CreditRange) {
	const prefix =
		range.disc == null ? "" : `${range.disc.name ?? range.disc.index}.`
	const start = `${prefix}${range.start}`
	const end = `${prefix}${range.end}`
	return range.start === range.end ? start : `${start}–${end}`
}

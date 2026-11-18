export function formatTrackPosition(
	disc: { index: number; name?: string | null } | null,
	trackNumber: string,
) {
	if (disc === null) return trackNumber

	const { name, index } = disc
	const discLabel = name == null || name === "" ? index : name
	return `${discLabel}.${trackNumber}`
}

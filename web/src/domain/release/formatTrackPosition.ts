export function formatTrackPosition(
	disc: { index: number; name?: string | null } | null,
	trackNumber: string,
) {
	const discLabel = disc?.name ?? disc?.index
	return discLabel ? `${discLabel}.${trackNumber}` : trackNumber
}

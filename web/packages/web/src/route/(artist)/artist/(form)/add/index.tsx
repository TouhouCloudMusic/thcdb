import { createSignal } from "solid-js"
import { ArtistFormLayout } from "../edit/[id]"

export default function AddArtistPage() {
	const [NULL] = createSignal(null)
	return <ArtistFormLayout data={NULL} />
}

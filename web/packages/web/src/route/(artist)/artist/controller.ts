import { createContext, useContext } from "solid-js"
import { DynamicBase } from "~/lib/class/dynamic_base"
import { type ArtistByID_ArtistProfile } from "./(profile)/data"

export const Context = createContext<ArtistProfilePageController>()
export const useController = () => useContext(Context)!

export class ArtistProfilePageController {
	private dataController: ArtistDataController
	constructor(artist: NonNullable<ArtistByID_ArtistProfile>) {
		this.dataController = new ArtistDataController(artist)
	}

	public get data() {
		return this.dataController
	}
}

class ArtistDataController extends DynamicBase<
	NonNullable<ArtistByID_ArtistProfile>
> {
	public get isPerson() {
		return this.artist_type === "Person"
	}

	public get isGroup() {
		return this.artist_type === "Group"
	}
}

import { createContext, useContext } from "solid-js"
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

export class ArtistDataController {
	constructor(private readonly data: NonNullable<ArtistByID_ArtistProfile>) {}

	public get id() {
		return this.data.id
	}

	public get created_at() {
		return this.data.created_at
	}

	public get updated_at() {
		return this.data.updated_at
	}

	public get str_member() {
		return this.data.str_member
	}

	public get members() {
		return this.data.members
	}

	public get member_of() {
		return this.data.member_of
	}

	public get app_id() {
		return this.data.app_id
	}

	public get artist_type() {
		return this.data.artist_type
	}

	public get date_of_end() {
		return this.data.date_of_end
	}

	public get date_of_start() {
		return this.data.date_of_start
	}

	public get name() {
		return this.data.name
	}

	public get str_alias() {
		return this.data.str_alias
	}

	public get isPerson() {
		return this.artist_type === "Person"
	}

	public get isGroup() {
		return this.artist_type === "Group"
	}

	public get release() {
		return this.data.release
	}

	public get song() {
		return this.data.song
	}
}

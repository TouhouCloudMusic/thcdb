import { type FormStore, getValues, setValues } from "@modular-forms/solid"
import { type artist } from "@touhouclouddb/database/interfaces"
import { type Accessor } from "solid-js"
import { produce, type SetStoreFunction } from "solid-js/store"
import { type $Store } from "~/lib/type/solid-js/store"
import { type ControllerStore } from "."
import { type ArtistFormSchema, type MemberListSchema } from "../form"

export class ArtistTypeController {
	constructor(
		private store: ControllerStore,
		private setStore: SetStoreFunction<ControllerStore>,
		private formStore: Accessor<FormStore<ArtistFormSchema>>
	) {}

	get isPerson() {
		return this.store.artistType === "Person"
	}

	get isGroup() {
		return this.store.artistType === "Group"
	}

	get isNone() {
		return this.store.artistType === undefined
	}

	toPerson() {
		return setArtistType([this.store, this.setStore], this.formStore, "Person")
	}

	toGroup() {
		return setArtistType([this.store, this.setStore], this.formStore, "Group")
	}
}

function setArtistType(
	[store, setStore]: $Store<ControllerStore>,
	formStore: () => FormStore<ArtistFormSchema>,
	artistType: artist.ArtistType
) {
	setStore("artistType", artistType)

	const currentList = getValues(formStore(), "member") as MemberListSchema

	setValues(formStore(), "member", store.member.cache ?? [])

	setStore(
		"member",
		produce((member) => {
			member.cache = currentList
			member.searchResult = undefined
		})
	)
}

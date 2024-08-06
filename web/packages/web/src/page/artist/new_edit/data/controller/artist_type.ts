import {
	type FormStore,
	getValue,
	getValues,
	setValues,
} from "@modular-forms/solid"
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
		return getValue(this.formStore(), "artist_type") === "Person"
	}

	get isGroup() {
		return getValue(this.formStore(), "artist_type") === "Group"
	}

	get isNone() {
		return getValue(this.formStore(), "artist_type") === undefined
	}

	toPerson() {
		return setArtistType([this.store, this.setStore], this.formStore)
	}

	toGroup() {
		return setArtistType([this.store, this.setStore], this.formStore)
	}
}

function setArtistType(
	[store, setStore]: $Store<ControllerStore>,
	formStore: () => FormStore<ArtistFormSchema>
) {
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

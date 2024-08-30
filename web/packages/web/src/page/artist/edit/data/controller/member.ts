import {
	type FormStore,
	getValue,
	getValues,
	insert,
	remove,
} from "@modular-forms/solid"
import { type Accessor } from "solid-js"
import { type SetStoreFunction } from "solid-js/store"
import { isEmptyArray } from "~/lib/validate/array"
import { type ControllerStore } from "."
import { type ArtistByKeyword, findArtistByKeyword } from "../db"
import { type ArtistFormSchema, type MemberSchema } from "../form"

export class MemberController {
	constructor(
		private store: ControllerStore,
		private setStore: SetStoreFunction<ControllerStore>,
		private formStore: Accessor<FormStore<ArtistFormSchema>>
	) {}
	get searchResult() {
		return this.store.member.searchResult
	}

	add(newArtist: ArtistByKeyword) {
		const memberList = getValues(this.formStore(), "member")
		if (memberList.find((a) => a?.id === newArtist.id)) return
		if (newArtist.artist_type === getValue(this.formStore(), "artist_type"))
			return
		insert(this.formStore(), "member", {
			value: {
				id: newArtist.id,
				name: newArtist.name,
				is_str: false,
				join_year: null,
				leave_year: null,
			} satisfies MemberSchema,
		})
	}

	addStringInput() {
		insert(this.formStore(), "member", {
			value: {
				name: "",
				is_str: true,
				join_year: null,
				leave_year: null,
			},
		})
	}

	remove(index: number) {
		remove(this.formStore(), "member", {
			at: index,
		})
	}

	async serach(keyword: string) {
		if (keyword.length < 3) {
			this.setStore("member", "searchResult", undefined)
			return
		}
		const artistType =
			getValue(this.formStore(), "artist_type") === "Person" ? "Group" : (
				"Person"
			)
		const existArtists = getValues(this.formStore(), "member")
			.map((m) => m?.id)
			.filter((id) => id !== "")
			.concat(
				getValue(this.formStore(), "id", { shouldActive: false })
			) as string[]
		const result = await findArtistByKeyword(keyword, artistType, existArtists)

		if (isEmptyArray(result)) {
			this.setStore("member", "searchResult", undefined)
			return
		}
		const searchResult = result.map(
			(a) =>
				({
					id: a.id,
					app_id: a.app_id,
					name: a.name,
					artist_type: a.artist_type,
				}) satisfies ArtistByKeyword
		)
		this.setStore("member", "searchResult", searchResult)
	}
}

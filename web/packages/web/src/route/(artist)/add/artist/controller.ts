import {
	createFormStore,
	getValues,
	insert,
	remove,
	setValues,
	valiForm,
} from "@modular-forms/solid"
import * as R from "ramda"
import { createSignal } from "solid-js"
import { Nullable } from "vitest"
import { ArtistByID } from "~/database/artist/find_artist_by_id"
import { Artist } from "@touhouclouddb/database"
import { isEmptyArray } from "~/lib/validate/array"
import {
	ArtistByKeyword_EditArtistPage,
	ArtistListByKeyword_EditArtistPage,
	findArtistByKeyword_EditArtistPage,
} from "./db"
import { ArtistFormSchema } from "./form_schema"
import { ArtistForm, MemberList, MemberListItem } from "./type"

export function createController() {
	const [artistData, setArtistData] = createSignal<ArtistByID>()
	const formStore = createFormStore<ArtistForm>({
		validate: valiForm(ArtistFormSchema),
	})
	const [oldValue, setOldValue] = createSignal<Nullable<Partial<ArtistForm>>>()
	const [formErrorMsg, setFormErrorMsg] = createSignal<string>()
	const formController = {
		oldValue,
		setOldValue,
		get changed() {
			return !R.equals(oldValue(), getValues(formStore))
		},
		get errMsg() {
			return formErrorMsg()
		},
		setErrMsg: setFormErrorMsg,
	}
	// type
	const [artistType, setArtistType] = createSignal<Artist.ArtistType>()

	function setArtistTypeWithSwapMemberListCache(type: Artist.ArtistType) {
		setArtistType(type)
		setMemberSearchResult(undefined)
		const cache = memberListCache()
		const memberList = getValues(formStore, "member") as MemberList
		setMemberListCache(memberList)
		setValues(formStore, "member", cache ?? [])
	}

	const typeController = {
		get value() {
			return artistType()
		},
		setType: setArtistTypeWithSwapMemberListCache,
		toPerson: () => setArtistTypeWithSwapMemberListCache("Person"),
		toGroup: () => setArtistTypeWithSwapMemberListCache("Group"),
	}
	// member
	const [memberSearchResult, setMemberSearchResult] =
		createSignal<ArtistListByKeyword_EditArtistPage>()
	const [memberListCache, setMemberListCache] = createSignal<MemberList>()

	const memberController = {
		get searchResult() {
			return memberSearchResult()
		},

		add: (input: ArtistByKeyword_EditArtistPage) => {
			const artist: MemberListItem = {
				id: input.id,
				name: input.name,
				artist_type: input.artist_type,
				is_str: false,
			}
			const memberList = getValues(formStore, "member")
			if (memberList.find((a) => a?.id === artist.id)) return
			if (artist.artist_type === artistType()) return
			insert(formStore, "member", {
				value: artist,
			})
		},

		addStringInput: () => {
			insert(formStore, "member", {
				value: {
					id: undefined,
					artist_type: artistType() === "Person" ? "Group" : "Person",
					name: "",
					is_str: true,
				},
			})
		},

		remove: (index: number) => {
			remove(formStore, "member", {
				at: index,
			})
		},

		serach: async (keyword: string) => {
			if (keyword.length < 3) {
				setMemberSearchResult(undefined)
			} else {
				const type = artistType()!
				const res = await findArtistByKeyword_EditArtistPage(keyword, type)
				console.log(res)

				if (isEmptyArray(res)) {
					setMemberSearchResult(undefined)
				} else {
					setMemberSearchResult(
						res.map((a) => ({
							id: a.id,
							name: a.name,
							artist_type: a.artist_type,
						}))
					)
				}
			}
		},
	}
	return {
		artistData,
		setArtistData,
		formStore,
		form: formController,
		type: typeController,
		member: memberController,
	}
}

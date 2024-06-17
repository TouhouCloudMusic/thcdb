import {
	createFormStore,
	getValues,
	insert,
	remove,
	setValues,
	valiForm,
} from "@modular-forms/solid"
import { either } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import { createSignal } from "solid-js"
import { ArtistType } from "~/database/artist/artist_model"
import { ArtistDataByID } from "~/database/artist/find_artist_by_id"
import {
	ArtistDataByKeyword,
	findArtistByKeyword,
} from "~/database/artist/find_artist_by_keyword"
import { ArtistFormSchema } from "./form_schema"
import { ArtistForm, MemberList, MemberListItem } from "./type"
import * as R from "ramda"
import { Nullable } from "vitest"

export function createController() {
	const [artistData, setArtistData] = createSignal<ArtistDataByID>()
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
	const [artistType, setArtistType] = createSignal<ArtistType>()

	function setArtistTypeWithSwapMemberListCache(type: ArtistType) {
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
		createSignal<ArtistDataByKeyword>()
	const [memberListCache, setMemberListCache] = createSignal<MemberList>()

	const memberController = {
		get searchResult() {
			return memberSearchResult()
		},

		add: (input: { id: bigint; name: string; type: ArtistType }) => {
			const artist: MemberListItem = {
				artistID: input.id.toString(),
				name: input.name,
				type: input.type,
				isText: false,
				groupMemberID: "",
				joinYear: null,
				leaveYear: null,
			}
			const memberList = getValues(formStore, "member")
			if (memberList.find((a) => a?.artistID === artist.artistID)) return
			if (artist.type === artistType()) return
			insert(formStore, "member", {
				value: artist,
			})
		},
		addStringInput: () => {
			insert(formStore, "member", {
				value: {
					artistID: "",
					type: artistType() === "Person" ? "Group" : "Person",
					name: "",
					isText: true,
					groupMemberID: "",
					joinYear: null,
					leaveYear: null,
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
				return setMemberSearchResult(undefined)
			} else
				return pipe(
					await findArtistByKeyword(
						keyword,
						artistType() === "Person" ? "Group" : "Person"
					),
					either.match(
						(err) => {
							throw err
						},
						(data) => {
							setMemberSearchResult(data)
						}
					)
				)
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

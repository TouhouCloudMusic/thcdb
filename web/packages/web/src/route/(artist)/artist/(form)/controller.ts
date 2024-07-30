import {
	createFormStore,
	getValues,
	insert,
	remove,
	setValues,
	valiForm,
} from "@modular-forms/solid"
import * as i18n from "@solid-primitives/i18n"
import { type artist } from "@touhouclouddb/database/interfaces"
import * as R from "ramda"
import type { Accessor } from "solid-js"
import { createSignal } from "solid-js"
import { isEmptyArray } from "~/lib/validate/array"
import {
	findArtistByKeyword_EditArtistPage,
	type ArtistArrayByKeyword_EditArtistPage,
	type ArtistByID_EditArtistPage,
	type ArtistByKeyword_EditArtistPage,
} from "./data/get"
import { ArtistFormSchema } from "./form_schema"
import type { FlatDict } from "./i18n"
import { initFormStore_Member } from "./init_member"
import type { ArtistForm, MemberList, MemberListItem } from "./type"

export function createController(
	data: Accessor<ArtistByID_EditArtistPage | null | undefined>,
	dict: Accessor<FlatDict | undefined>
) {
	const initData = data()
	const initFormValue =
		!initData ? undefined : (
			{
				id: initData.id.toString(),
				name: initData.name,
				artist_type: initData.artist_type,
				member: initFormStore_Member(initData),
			}
		)

	// form
	const formStore = createFormStore<ArtistForm>({
		validate: valiForm(ArtistFormSchema),
		initialValues: initFormValue,
	})

	const [formErrorMsg, setFormErrorMsg] = createSignal<string>()
	const formController = {
		get changed() {
			return !R.equals(initFormValue, getValues(formStore))
		},
		get errMsg() {
			return formErrorMsg()
		},
		setErrMsg: setFormErrorMsg,
	}
	// type
	// setter is private
	const [artistType, setArtistType] = createSignal<
		artist.ArtistType | undefined
	>(initData?.artist_type)

	function setArtistTypeWithSwapMemberListCache(type: artist.ArtistType) {
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
		toPerson: () => setArtistTypeWithSwapMemberListCache("Person"),
		toGroup: () => setArtistTypeWithSwapMemberListCache("Group"),
		isPerson: () => artistType() === "Person",
		isGroup: () => artistType() === "Group",
		isNone: () => artistType() === undefined,
	}
	// member
	const [memberSearchResult, setMemberSearchResult] =
		createSignal<ArtistArrayByKeyword_EditArtistPage>()
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
				const type = artistType() === "Person" ? "Group" : "Person"
				const res = await findArtistByKeyword_EditArtistPage(keyword, type)

				if (isEmptyArray(res)) {
					setMemberSearchResult(undefined)
				} else {
					setMemberSearchResult(
						res.map(
							(a) =>
								({
									id: a.id,
									app_id: a.app_id,
									name: a.name,
									artist_type: a.artist_type,
								}) satisfies ArtistByKeyword_EditArtistPage
						)
					)
				}
			}
		},
	}

	return {
		t: i18n.translator(dict),
		artistData: initData,
		formStore,
		form: formController,
		type: typeController,
		member: memberController,
	}
}

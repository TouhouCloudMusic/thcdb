import {
	createFormStore,
	getValues,
	insert,
	remove,
	setValues,
	valiForm,
	type FormStore,
} from "@modular-forms/solid"
import * as i18n from "@solid-primitives/i18n"
import { type artist } from "@touhouclouddb/database/interfaces"
import * as R from "ramda"
import { createMemo, createSignal } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { type Nullable } from "~/lib/type/nullable"
import { type $Store } from "~/lib/type/solid-js/store"
import { isEmptyArray } from "~/lib/validate/array"
import {
	findArtistByKeyword,
	type ArtistByID,
	type ArtistByKeyword,
	type ArtistByKeywordArray,
} from "./db"
import {
	ArtistFormSchema,
	type MemberListSchema,
	type MemberSchema,
} from "./form"
import { initFormStoreMemberList } from "./form/init"
import type { FlatDict } from "./i18n"

type ControllerStore = {
	artistType: artist.ArtistType | undefined
	member: {
		list: MemberListSchema | undefined
		cache?: MemberListSchema | undefined
		searchResult?: ArtistByKeywordArray | undefined
	}
}
export function createController(
	initData: () => Nullable<ArtistByID>,
	dict: () => FlatDict
) {
	const initFormValue = createMemo(() =>
		!initData() ? undefined : (
			({
				id: initData()!.id,
				name: initData()!.name,
				artist_type: initData()!.artist_type,
				// TODO: Alias
				alias: undefined,
				member: initData() ? initFormStoreMemberList(initData()!) : undefined,
			} as ArtistFormSchema)
		)
	)

	const formStore = createMemo(() =>
		createFormStore<ArtistFormSchema>({
			validate: valiForm(ArtistFormSchema),
			initialValues: initFormValue(),
		})
	)
	const [formErrorMsg, setFormErrorMsg] = createSignal<string>()

	const [store, setStore] = createStore<ControllerStore>({
		artistType: initFormValue()?.artist_type,
		member: {
			list: initFormValue()?.member,
		},
	})

	const formController = {
		get changed() {
			return !R.equals(initFormValue(), getValues(formStore()))
		},
		get errMsg() {
			return formErrorMsg()
		},
		setErrMsg: setFormErrorMsg,
	}

	const artistTypeController = {
		get value() {
			return store.artistType
		},
		toPerson: () => setArtistType([store, setStore], formStore, "Person"),
		toGroup: () => setArtistType([store, setStore], formStore, "Group"),
		isPerson: () => store.artistType === "Person",
		isGroup: () => store.artistType === "Group",
		isNone: () => store.artistType === undefined,
	}

	const memberController = {
		get searchResult() {
			return store.member.searchResult
		},

		add(newArtist: ArtistByKeyword) {
			const memberList = getValues(formStore(), "member")
			if (memberList.find((a) => a?.id === newArtist.id)) return
			if (newArtist.artist_type === store.artistType) return
			insert(formStore(), "member", {
				value: {
					id: newArtist.id,
					name: newArtist.name,
					is_str: false,
					join_year: null,
					leave_year: null,
				} satisfies MemberSchema,
			})
		},

		addStringInput() {
			insert(formStore(), "member", {
				value: {
					id: "",
					name: "",
					is_str: true,
					join_year: null,
					leave_year: null,
				},
			})
		},

		remove(index: number) {
			remove(formStore(), "member", {
				at: index,
			})
		},

		async serach(keyword: string) {
			if (keyword.length < 3) {
				// setMemberSearchResult(undefined)
				setStore("member", "searchResult", undefined)
			} else {
				const type = store.artistType === "Person" ? "Group" : "Person"
				let existArtists = getValues(formStore(), "member")
					.map((m) => m?.id)
					.filter((id) => id !== "") as string[]

				const res = await findArtistByKeyword(keyword, type, existArtists)

				if (isEmptyArray(res)) {
					setStore("member", "searchResult", undefined)
				} else {
					setStore(
						"member",
						"searchResult",
						res.map(
							(a) =>
								({
									id: a.id,
									app_id: a.app_id,
									name: a.name,
									artist_type: a.artist_type,
								}) satisfies ArtistByKeyword
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
		artistType: artistTypeController,
		member: memberController,
	}
}

function setArtistType(
	[store, setStore]: $Store<ControllerStore>,
	formStore: () => FormStore<ArtistFormSchema>,
	artistType: artist.ArtistType
) {
	// update type
	setStore("artistType", artistType)
	// get current list
	const currentList = getValues(formStore(), "member") as MemberListSchema
	// swap
	setValues(formStore(), "member", store.member.cache ?? [])

	// push old to cache and clear search result
	setStore(
		"member",
		produce((member) => {
			member.cache = currentList
			member.searchResult = undefined
		})
	)
}

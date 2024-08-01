import {
	createFormStore,
	getValues,
	insert,
	remove,
	setValue,
	valiForm,
} from "@modular-forms/solid"
import * as i18n from "@solid-primitives/i18n"
import { type artist } from "@touhouclouddb/database/interfaces"
import * as R from "ramda"
import { createMemo, createSignal } from "solid-js"
import { type Nullable } from "~/lib/type/nullable"
import { isEmptyArray } from "~/lib/validate/array"
import {
	findArtistByKeyword_EditArtistPage,
	type ArtistByID,
	type ArtistByKeyword,
	type ArtistByKeywordArray,
} from "./db/private"
import type {
	ArtistForm,
	MemberList,
	MemberListItem,
} from "./form_schema/private"
import { ArtistFormSchema } from "./form_schema/private"
import type { FlatDict } from "./i18n/private"
import { initFormStoreMemberList } from "./private/init"

export function createController(
	data: () => Nullable<ArtistByID>,
	dict: () => FlatDict
) {
	// 需要测试data更新后不memo是否会触发更新
	const initFormValue = createMemo(() =>
		!data() ? undefined : (
			{
				id: data()?.id.toString(),
				name: data()?.name,
				artist_type: data()?.artist_type,
				member: data() ? initFormStoreMemberList(data()!) : undefined,
			}
		)
	)

	const formStore = createMemo(() =>
		createFormStore<ArtistForm>({
			validate: valiForm(ArtistFormSchema),
			initialValues: initFormValue(),
		})
	)
	const [formErrorMsg, setFormErrorMsg] = createSignal<string>()

	const [artistType, setArtistType] = createSignal<
		artist.ArtistType | undefined
	>(data()?.artist_type)

	const [memberSearchResult, setMemberSearchResult] =
		createSignal<ArtistByKeywordArray>()
	const [memberListCache, setMemberListCache] = createSignal<MemberList>()

	function setArtistTypeWithSwapMemberListCache(type: artist.ArtistType) {
		setArtistType(type)
		setMemberSearchResult(undefined)
		const cache = memberListCache()
		const memberList = getValues(formStore(), "member") as MemberList
		setMemberListCache(memberList)
		setValue(formStore(), "member", cache ?? [])
	}

	const formController = {
		get changed() {
			return !R.equals(initFormValue(), getValues(formStore()))
		},
		get errMsg() {
			return formErrorMsg()
		},
		setErrMsg: setFormErrorMsg,
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

	const memberController = {
		get searchResult() {
			return memberSearchResult()
		},

		add(input: ArtistByKeyword) {
			const memberList = getValues(formStore(), "member")
			if (memberList.find((a) => a?.id === input.id)) return
			if (input.artist_type === artistType()) return
			insert(formStore(), "member", {
				value: {
					id: input.id,
					name: input.name,
					is_str: false,
					join_year: null,
					leave_year: null,
				} satisfies MemberListItem,
			})
		},

		addStringInput() {
			insert(formStore(), "member", {
				value: {
					id: undefined,
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
								}) satisfies ArtistByKeyword
						)
					)
				}
			}
		},
	}

	return {
		t: i18n.translator(dict),
		artistData: data,
		formStore,
		form: formController,
		type: typeController,
		member: memberController,
	}
}

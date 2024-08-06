import { createFormStore, getValues, valiForm } from "@modular-forms/solid"
import * as i18n from "@solid-primitives/i18n"
import { type artist } from "@touhouclouddb/database/interfaces"
import * as R from "ramda"
import { createMemo, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID, type ArtistByKeywordArray } from "../db"
import { ArtistFormSchema, type MemberListSchema } from "../form"
import { initFormStoreMemberList } from "../form/init"
import { type FlatDict } from "../i18n"
import { ArtistTypeController } from "./artist_type"
import { MemberController } from "./member"

export interface ControllerStore {
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
				members: initData() ? initFormStoreMemberList(initData()!) : undefined,
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

	return {
		t: i18n.translator(dict),
		artistData: initData,
		formStore,
		form: formController,
		artistType: new ArtistTypeController(store, setStore, formStore),
		member: new MemberController(store, setStore, formStore),
	}
}

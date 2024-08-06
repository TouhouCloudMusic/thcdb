import { createFormStore, getValues, valiForm } from "@modular-forms/solid"
import * as i18n from "@solid-primitives/i18n"
import * as R from "ramda"
import { createMemo, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID, type ArtistByKeywordArray } from "../db"
import { ArtistFormSchema, type MemberListSchema } from "../form"
import { initFormStoreMemberList } from "../form/init"
import { type Dict } from "../i18n"
import { AliasController } from "./alias"
import { ArtistTypeController } from "./artist_type"
import { MemberController } from "./member"

export interface ControllerStore {
	alias: {
		searchResult?: ArtistByKeywordArray | undefined
	}
	member: {
		list: MemberListSchema | undefined
		cache?: MemberListSchema | undefined
		searchResult?: ArtistByKeywordArray | undefined
	}
}
export function createController(
	initData: () => Nullable<ArtistByID>,
	dict: () => Dict
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
		alias: {
			searchResult: undefined,
		},
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
		t: i18n.chainedTranslator(
			dict(),
			i18n.translator(() => i18n.flatten(dict()), i18n.resolveTemplate)
		),
		artistData: initData,
		formStore,
		form: formController,
		artistType: new ArtistTypeController(store, setStore, formStore),
		alias: new AliasController(store, setStore, formStore),
		member: new MemberController(store, setStore, formStore),
	}
}

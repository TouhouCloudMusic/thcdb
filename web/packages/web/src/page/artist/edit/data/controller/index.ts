import {
	createForm,
	createFormStore,
	FormStore,
	getValues,
	reset,
	valiForm,
} from "@modular-forms/solid"
import { type ChainedTranslator } from "@solid-primitives/i18n"
import { type CreateQueryResult } from "@tanstack/solid-query"
import * as R from "ramda"
import { createEffect, createMemo, createSignal } from "solid-js"
import { createStore } from "solid-js/store"
import { toChainedTranslator } from "~/lib/i18n/to_chained_translator.ts"
import { type Nullable } from "~/lib/type/nullable"
import { type ArtistByID, type ArtistByKeywordArray } from "../db"
import {
	ArtistFormSchema,
	initFormStoreMemberList,
	type MemberListSchema,
} from "../form"
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
// export function createController(
// 	initData: () => Nullable<ArtistByID>,
// 	dict: () => Dict
// ) {
// 	const initFormValue = createMemo(() =>
// 		!initData() ? undefined : (
// 			({
// 				id: initData()!.id,
// 				name: initData()!.name,
// 				artist_type: initData()!.artist_type,
// 				// TODO: Alias
// 				alias: undefined,
// 				members: initData() ? initFormStoreMemberList(initData()!) : undefined,
// 			} as ArtistFormSchema)
// 		)
// 	)

// 	const formStore = createMemo(() =>
// 		createFormStore<ArtistFormSchema>({
// 			validate: valiForm(ArtistFormSchema),
// 			initialValues: initFormValue(),
// 		})
// 	)
// 	const [formErrorMsg, setFormErrorMsg] = createSignal<string>()

// 	const [store, setStore] = createStore<ControllerStore>({
// 		alias: {
// 			searchResult: undefined,
// 		},
// 		member: {
// 			list: initFormValue()?.member,
// 		},
// 	})

// 	const formController = {
// 		get changed() {
// 			return !R.equals(initFormValue(), getValues(formStore()))
// 		},
// 		get errMsg() {
// 			return formErrorMsg()
// 		},
// 		setErrMsg: setFormErrorMsg,
// 	}

// 	return {
// 		t: i18n.chainedTranslator(
// 			dict(),
// 			i18n.translator(() => i18n.flatten(dict()), i18n.resolveTemplate)
// 		),
// 		initData,
// 		formStore,
// 		form: formController,
// 		artistType: new ArtistTypeController(store, setStore, formStore),
// 		alias: new AliasController(store, setStore, formStore),
// 		member: new MemberController(store, setStore, formStore),
// 	}
// }

export function createController(
	dataQuery: CreateQueryResult<Nullable<ArtistByID>> | undefined,
	dict: () => Dict
) {
	const initData = createMemo(() => dataQuery?.data)

	const [initFormValue, setInitFormValue] = createSignal<ArtistFormSchema>()

	const [formStore, { Form, Field, FieldArray }] = createForm<ArtistFormSchema>(
		{
			validate: valiForm(ArtistFormSchema),
		}
	)

	createEffect(() => {
		if (dataQuery?.isSuccess && dataQuery.data) {
			const newValue = setInitFormValue({
				id: dataQuery.data.id,
				name: dataQuery.data.name,
				artist_type: dataQuery.data.artist_type,
				// TODO: Alias
				alias: undefined,
				members: initFormStoreMemberList(dataQuery.data),
			})
			// https://github.com/fabian-hiller/modular-forms/issues/87
			reset(formStore, {
				initialValues: newValue,
			})
			reset(formStore, {
				initialValues: newValue,
			})
		}
	})

	const [formErrorMsg, setFormErrorMsg] = createSignal<string>()

	const [store, setStore] = createStore<ControllerStore>({
		alias: {
			searchResult: undefined,
		},
		member: {
			list: undefined,
		},
	})

	const formController = {
		get changed() {
			return !R.equals(
				initFormValue(),
				getValues(formStore, {
					shouldActive: false,
				})
			)
		},
		get errMsg() {
			return formErrorMsg()
		},
		setErrMsg: setFormErrorMsg,
	}

	return {
		t: toChainedTranslator(dict),
		dataQuery,
		initData,
		formStore,
		Form,
		Field,
		FieldArray,
		form: formController,
		artistType: new ArtistTypeController(store, setStore, formStore),
		alias: new AliasController(store, setStore, formStore),
		member: new MemberController(store, setStore, () => formStore),
	}
}

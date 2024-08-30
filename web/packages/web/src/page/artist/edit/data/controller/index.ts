import { createForm, getValues, reset, valiForm } from "@modular-forms/solid"
import { type CreateQueryResult } from "@tanstack/solid-query"
import * as Option from "fp-ts/Option"
import { pipe } from "fp-ts/function"
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
			const newValue: ArtistFormSchema = {
				id: dataQuery.data.id,
				name: dataQuery.data.name,
				artist_type: dataQuery.data.artist_type,
				// TODO: Alias
				// alias: undefined,
			}

			pipe(
				dataQuery.data,
				initFormStoreMemberList,
				Option.map((m) => {
					newValue.member = m
				})
			)

			setInitFormValue(newValue)
			// https://github.com/fabian-hiller/modular-forms/issues/87
			reset(formStore, {
				initialValues: newValue,
			})
			setTimeout(() => {
				reset(formStore, {
					initialValues: newValue,
				})
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
			console.log("init:", initFormValue())
			console.info(
				"current: ",
				getValues(formStore, {
					shouldActive: false,
				})
			)

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
		initFormValue,
		Form,
		Field,
		FieldArray,
		form: formController,
		artistType: new ArtistTypeController(store, setStore, formStore),
		alias: new AliasController(store, setStore, formStore),
		member: new MemberController(store, setStore, () => formStore),
	}
}

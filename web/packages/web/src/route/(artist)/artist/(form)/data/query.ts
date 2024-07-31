import {
	createQuery,
	type QueryClient,
	type QueryOptions,
} from "@tanstack/solid-query"
import { type AppLocale } from "~/state/i18n"
import { fetchDictionary } from "../i18n"
import { findArtistByID_EditArtistPage } from "./db"

const pageName = ["edit_artist_page"]

const dataQueryKey = pageName.concat("artist_data")

function dataQueryOption(id: string) {
	return {
		queryKey: dataQueryKey.concat(id),
		queryFn: () => findArtistByID_EditArtistPage(id),
	} satisfies QueryOptions
}

export function fetchData(id: () => string) {
	return createQuery(() => dataQueryOption(id()))
}

export function prefetchData(id: string, client: QueryClient) {
	console.log("prefetching")

	return client.prefetchQuery(dataQueryOption(id))
}

const dictQueryKey = pageName.concat("i18n_dict")

function dictQueryOption(locale: AppLocale) {
	return {
		queryKey: dictQueryKey.concat(locale),
		queryFn: () => fetchDictionary(locale),
	} satisfies QueryOptions
}

export function fetchDict(locale: () => AppLocale) {
	return createQuery(() => dictQueryOption(locale()))
}

export function prefetchDict(locale: AppLocale, client: QueryClient) {
	return client.prefetchQuery(dictQueryOption(locale))
}

"use server"
import { type Params, cache, redirect } from "@solidjs/router"
import e from "@touhouclouddb/database"
import { validateAndThrowRedirectEither } from "~/lib/validate/throw_redirect"
import { isEmptyOrValidID } from "~/lib/validate/validate_params"
import { findArtistByID_EditArtistPage } from "./db"

export const initData = cache(async function (params: Params) {
	const id = validateAndThrowRedirectEither(isEmptyOrValidID, params)
	if (!id) return
	try {
		return await findArtistByID_EditArtistPage(id)
	} catch (error) {
		// TODO: 研究如何把error发到客户端上
		console.log(e)
		throw redirect("/500")
	}
}, `init_edit_artist_page`)

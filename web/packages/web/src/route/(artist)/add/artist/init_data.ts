import { cache, redirect, type Params } from "@solidjs/router"
import { taskEither } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import { matchUnknownToError } from "~/lib/convert/match_unknown_to_error"
import { validateAndThrowRedirectEither } from "~/lib/validate/throw_redirect"
import { isEmptyOrValidID } from "~/lib/validate/validate_params"
import { findArtistByID_EditArtistPage } from "./db"

export const initData = cache(async function (params: Params) {
	"use server"
	const id = validateAndThrowRedirectEither(isEmptyOrValidID, params)
	if (!id) return
	const task = pipe(
		taskEither.tryCatch(
			() => findArtistByID_EditArtistPage(id),
			(reason) => matchUnknownToError(reason)
		),
		taskEither.match(
			() => {
				// TODO: 研究如何把error发到客户端上
				// TODO: 错误日志
				throw redirect("/500")
			},
			(data) => data
		)
	)
	const res = await task()
	if (!res) throw redirect("/404")
	else return res
}, `init_edit_artist_page`)

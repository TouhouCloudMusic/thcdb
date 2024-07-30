import type * as v from "valibot"
import type { initData } from "./data/init"
import type { ArtistFormSchema } from "./form_schema"

export type ArtistForm = v.InferInput<typeof ArtistFormSchema>
export type ArtistData_EditPage = Awaited<ReturnType<typeof initData>>
export type MemberList = NonNullable<ArtistForm["member"]>
export type MemberListItem = MemberList[number]

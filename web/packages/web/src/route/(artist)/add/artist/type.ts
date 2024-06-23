import { ArtistFormSchema } from "./form_schema"
import * as v from "valibot"
import { getData } from "./init_data"

export type ArtistForm = v.InferInput<typeof ArtistFormSchema>
export type ArtistData_EditPage = Awaited<ReturnType<typeof getData>>
export type MemberList = NonNullable<ArtistForm["member"]>
export type MemberListItem = MemberList[number]

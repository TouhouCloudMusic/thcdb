import { ArtistFormSchema } from "./form_schema"
import * as v from "valibot"

export type ArtistForm = v.InferInput<typeof ArtistFormSchema>
export type MemberList = NonNullable<ArtistForm["member"]>
export type MemberListItem = MemberList[number]

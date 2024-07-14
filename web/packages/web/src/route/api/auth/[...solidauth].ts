import { SolidAuth } from "@solid-mediakit/auth"
import { authOption } from "~/lib/auth"



export const { GET, POST } = SolidAuth(authOption)

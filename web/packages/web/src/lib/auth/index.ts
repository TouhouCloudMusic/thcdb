import { redirect } from "@solidjs/router"
import { getWebRequest } from "vinxi/http"

import Github from "@auth/core/providers/github"
import { getSession, type SolidAuthConfig } from "@solid-mediakit/auth"

export const authOption: SolidAuthConfig = {
  providers: [
    Github({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  debug: true,
}

export async function getAuthSession() {
  "use server"
  const request = getWebRequest()
  const session = await getSession(request, authOption)
  if (!session) throw redirect("/")
  else return session
}

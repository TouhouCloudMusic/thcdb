import {
  createMutation,
  createQuery,
  queryOptions,
} from "@tanstack/solid-query"
import { notFound, useNavigate } from "@tanstack/solid-router"
import { type UserProfile } from "~/model/user"

import { FetchClient } from "."

type Deps = {
  "params.username"?: string | undefined
  current_user?: UserProfile
}

export async function userProfileEndpoint({
  "params.username": params_username,
}: Deps) {
  let res = await (params_username ?
    FetchClient.GET(`/profile/{name}`, {
      params: {
        path: {
          name: params_username,
        },
      },
    })
  : FetchClient.GET(`/profile`))

  if (res.data) {
    return res.data.data
  } else if (res.error) {
    throw res.error.message
  } else if (res.response.status === 404) {
    return undefined
  } else {
    throw Error("Unknown error")
  }
}

export function userProfileQuery(deps: Deps) {
  return createQuery(() => userProfileQueryOption(deps))
}

export function userProfileQueryOption({
  "params.username": params_username,
  current_user,
}: Deps) {
  return queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: ["profile", params_username ?? current_user?.name].filter(
      Boolean,
    ),
    queryFn: async () => {
      let user = await userProfileEndpoint({
        "params.username": params_username,
      })

      if (!user) {
        throw notFound()
      }

      return user
    },
    throwOnError: true,
  })
}

export function uploadAvatar(file: File) {
  let mutation = createMutation(() => ({
    mutationFn: (data: File) => {
      let formData = new FormData()
      formData.append("file", file)

      return FetchClient.POST(`/avatar`, {
        body: {
          data,
        },
      })
    },
  }))

  return mutation
}

import { QueryClient } from "."

export function profile(username?: string) {
  if (username) {
    return QueryClient.createQuery("get", "/profile/{name}", {
      params: {
        path: {
          name: username,
        },
      },
    })
  } else {
    return QueryClient.createQuery("get", "/profile")
  }
}

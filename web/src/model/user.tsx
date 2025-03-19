export type UserProfile = {
  name: string
  avatar_url?: string
  last_login?: Date
  roles: number[]
}

export type AuthCreds = {
  username: string
  password: string
}

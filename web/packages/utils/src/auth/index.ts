import { hash as hash_rs } from "@node-rs/argon2"
export type HashedString = string & { _hashed: true }
export async function hash(a: string): Promise<HashedString> {
  return (await hash_rs(a)) as HashedString
}

import crypto from "node:crypto"
export function toMd5Base64Url(
  byte:
    | string
    | Uint8Array
    | Uint8ClampedArray
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
    | BigUint64Array
    | BigInt64Array
    | Float32Array
    | Float64Array,
) {
  if (process.isBun) {
    return new Bun.CryptoHasher("md5").update(byte).digest("base64url")
  } else {
    return crypto.createHash("md5").update(byte).digest("base64url")
  }
}

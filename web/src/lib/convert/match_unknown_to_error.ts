export function matchUnknownToError(unknown: unknown) {
  if (unknown instanceof Error) {
    return unknown
  } else if (typeof unknown === "string") {
    return new Error(unknown)
  } else {
    return new Error("unknown error")
  }
}

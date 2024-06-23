export function validateError(error: unknown) {
	if (error instanceof Error) {
		return error
	} else if (typeof error === "string") {
		return new Error(error)
	} else {
		return new Error("unknown error")
	}
}

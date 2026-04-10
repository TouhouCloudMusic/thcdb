type MutationError = Error | { error: string }

export function toMutationError(
	error: MutationError,
	fallback = "Request failed.",
) {
	if (error instanceof Error) {
		return error.message ? error : new Error(fallback, { cause: error })
	}

	return new Error(error.error || fallback, {
		cause: error,
	})
}

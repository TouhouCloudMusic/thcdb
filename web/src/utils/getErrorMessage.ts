import { t } from "@lingui/core/macro"
import { ObjExt } from "@thc/toolkit/data"

export function getErrorMessage(error: unknown) {
	if (error instanceof Error) {
		return error.message
	}

	if (typeof error === "string") {
		return error
	}

	if (ObjExt.isRecord(error)) {
		const message = error["message"]
		if (typeof message === "string" && message.length > 0) {
			return message
		}

		const fallback = error["error"]
		if (typeof fallback === "string" && fallback.length > 0) {
			return fallback
		}
	}

	try {
		return JSON.stringify(error, (key, value) =>
			key === "stack" ? undefined : (value as unknown),
		)
	} catch {
		return t`Unknown error`
	}
}

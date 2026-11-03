const TRACE_ID_HEADER = "X-Trace-Id"
const responseTraceIds = new WeakMap<object, string>()

function canBindTraceId(value: unknown): value is object {
	return typeof value === "object" && value !== null
}

export function bindResponseTraceId<T>(error: T, response?: Response): T {
	const traceId = response?.headers.get(TRACE_ID_HEADER)
	if (traceId && canBindTraceId(error)) {
		responseTraceIds.set(error, traceId)
	}
	return error
}

export function getResponseTraceId(error: unknown): string | undefined {
	return canBindTraceId(error) ? responseTraceIds.get(error) : undefined
}

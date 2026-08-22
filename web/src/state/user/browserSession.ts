import * as v from "valibot"

const SESSION_LOCK_NAME = "thcdb-auth-session"
const SESSION_REVISION_KEY = "auth_session_revision"
const parseSessionRevision = v.safeParser(v.pipe(v.string(), v.uuid()))

export async function withSessionLock<T>(fn: () => T | PromiseLike<T>) {
	return globalThis.navigator.locks.request(SESSION_LOCK_NAME, fn)
}

export function readSessionRevision() {
	let value: string | null
	try {
		value = globalThis.localStorage.getItem(SESSION_REVISION_KEY)
	} catch {
		return undefined
	}

	const result = parseSessionRevision(value)
	return result.success ? result.output : undefined
}

export function broadcastSessionChange() {
	const revision = globalThis.crypto.randomUUID()

	try {
		globalThis.localStorage.setItem(SESSION_REVISION_KEY, revision)
	} catch {
		return undefined
	}

	return revision
}

export function subscribeTabSessionChanges<T>(listener: () => Promise<T>) {
	const receiveSessionChange = (event: StorageEvent) => {
		if (event.key !== SESSION_REVISION_KEY) return
		if (event.storageArea !== globalThis.localStorage) return
		if (!parseSessionRevision(event.newValue).success) return

		listener().catch(console.error)
	}

	globalThis.addEventListener("storage", receiveSessionChange)

	return () => {
		globalThis.removeEventListener("storage", receiveSessionChange)
	}
}

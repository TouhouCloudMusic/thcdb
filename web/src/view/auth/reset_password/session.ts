import { createSignal } from "solid-js"

const RESET_PASSWORD_EMAIL_KEY = "reset_password_email"
const RESET_PASSWORD_SESSION_KEY = "reset_password_session"

export type ResetPasswordSession = {
	keyExpiresMinutes: number
	expiresAtMs: number
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === "object" && input !== null
}

function isResetPasswordSession(input: unknown): input is ResetPasswordSession {
	if (!isRecord(input)) return false

	return (
		typeof input["keyExpiresMinutes"] === "number"
		&& Number.isFinite(input["keyExpiresMinutes"])
		&& typeof input["expiresAtMs"] === "number"
		&& Number.isFinite(input["expiresAtMs"])
	)
}

function loadStoredString(key: string): string | undefined {
	let value: string | null

	try {
		value = globalThis.sessionStorage.getItem(key)
	} catch {
		return undefined
	}

	if (value === null) return undefined

	return value
}

function saveStoredString(key: string, value: string | undefined) {
	try {
		if (value === undefined) {
			globalThis.sessionStorage.removeItem(key)
			return
		}

		globalThis.sessionStorage.setItem(key, value)
	} catch {
		void 0
	}
}

function normalizeResetPasswordEmail(email: string) {
	const normalizedEmail = email.trim()
	return normalizedEmail.length > 0 ? normalizedEmail : undefined
}

function normalizeResetPasswordSession(
	session: ResetPasswordSession,
): ResetPasswordSession | undefined {
	const normalizedSession =
		isResetPasswordSession(session) && session.expiresAtMs > Date.now()
			? session
			: undefined

	return normalizedSession
}

const [resetPasswordEmail, setResetPasswordEmail] = createSignal<
	string | undefined
>(loadStoredString(RESET_PASSWORD_EMAIL_KEY))
const storedResetPasswordSession: ResetPasswordSession | undefined = (():
	| ResetPasswordSession
	| undefined => {
	const stored = loadStoredString(RESET_PASSWORD_SESSION_KEY)
	if (stored === undefined) return undefined

	try {
		const parsed: unknown = JSON.parse(stored)
		if (isResetPasswordSession(parsed)) {
			return normalizeResetPasswordSession(parsed)
		}
	} catch {
		saveStoredString(RESET_PASSWORD_SESSION_KEY, undefined)
	}

	return undefined
})()
const [resetPasswordSession, setResetPasswordSession] = createSignal<
	ResetPasswordSession | undefined
>(storedResetPasswordSession)
const [resetPasswordSuccess, setResetPasswordSuccess] = createSignal(false)

export function clearResetPasswordEmail() {
	saveStoredString(RESET_PASSWORD_EMAIL_KEY, undefined)
	setResetPasswordEmail(undefined)
}

export function getResetPasswordEmail() {
	return resetPasswordEmail()
}

export function saveResetPasswordEmail(email: string) {
	const normalizedEmail = normalizeResetPasswordEmail(email)
	saveStoredString(RESET_PASSWORD_EMAIL_KEY, normalizedEmail)
	setResetPasswordEmail(normalizedEmail)
}

export function clearResetPasswordSession() {
	saveStoredString(RESET_PASSWORD_SESSION_KEY, undefined)
	setResetPasswordSession(undefined)
}

export function getResetPasswordSession(): ResetPasswordSession | undefined {
	const session = resetPasswordSession()
	const activeSession =
		session !== undefined && session.expiresAtMs > Date.now()
			? session
			: undefined

	if (session !== undefined && activeSession === undefined) {
		saveStoredString(RESET_PASSWORD_SESSION_KEY, undefined)
		setResetPasswordSession()
	}

	return activeSession
}

export function saveResetPasswordSession(session: ResetPasswordSession) {
	const normalizedSession = normalizeResetPasswordSession(session)
	saveStoredString(
		RESET_PASSWORD_SESSION_KEY,
		normalizedSession === undefined
			? undefined
			: JSON.stringify(normalizedSession),
	)
	setResetPasswordSession(normalizedSession)
	clearResetPasswordSuccess()
}

export function clearResetPasswordSuccess() {
	setResetPasswordSuccess(false)
}

export function hasResetPasswordSuccess() {
	return resetPasswordSuccess()
}

export function markResetPasswordSuccess() {
	clearResetPasswordSession()
	clearResetPasswordEmail()
	setResetPasswordSuccess(true)
}

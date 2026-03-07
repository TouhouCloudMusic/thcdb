import { createSignal } from "solid-js"

function normalizeVerificationEmail(email: string) {
	const normalizedEmail = email.trim()
	return normalizedEmail.length > 0 ? normalizedEmail : undefined
}

const [verificationEmail, setVerificationEmail] = createSignal<string>()

export function clearVerificationEmail() {
	setVerificationEmail()
}

export function getVerificationEmail() {
	return verificationEmail()
}

export function saveVerificationEmail(email: string) {
	setVerificationEmail(normalizeVerificationEmail(email))
}

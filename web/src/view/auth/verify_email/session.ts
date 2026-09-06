import { createSignal } from "solid-js"

export type VerificationSession = {
	email: string
	resendAvailableAt: number
	requestStatus: "idle" | "resending"
}

export const [getVerificationSession, setVerificationSession] =
	createSignal<VerificationSession>()

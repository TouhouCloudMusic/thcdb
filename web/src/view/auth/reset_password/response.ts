import type { ResetPasswordSession } from "./session"

export const REQUEST_FAILED_MESSAGE = "Request failed"

export type AuthApiResponse = {
	status: number
	data: unknown
}

type ApiErrorBody = {
	status: "Err"
	message: string
}

type ApiSuccessBody = {
	status: "Ok"
	data: unknown
}

type ForgotPasswordPayload = {
	verificationCodeExpiresMinutes: number
	resendCooldownSeconds: number
}

function isRecord(input: unknown): input is Record<string, unknown> {
	return typeof input === "object" && input !== null
}

function getNumber(input: unknown): number | undefined {
	if (typeof input !== "number" || !Number.isFinite(input)) return undefined
	return input
}

function getString(input: unknown): string | undefined {
	if (typeof input !== "string") return undefined

	const trimmed = input.trim()
	if (trimmed.length === 0) return undefined

	return trimmed
}

function parseApiSuccessBody(input: unknown): ApiSuccessBody | null {
	if (!isRecord(input)) return null
	if (input["status"] !== "Ok") return null
	if (!("data" in input)) return null

	return {
		status: "Ok",
		data: input["data"],
	}
}

function parseApiErrorBody(input: unknown): ApiErrorBody | null {
	if (!isRecord(input)) return null
	if (!("status" in input) || !("message" in input)) return null
	if (input["status"] !== "Err") return null
	if (typeof input["message"] !== "string") return null

	const message = input["message"].trim()
	if (message.length === 0) return null

	return { status: "Err", message }
}

function parseExpiresAtMs(input: unknown): number | undefined {
	const value = getString(input)
	if (value === undefined) return undefined

	const expiresAtMs = Date.parse(value)
	return Number.isFinite(expiresAtMs) ? expiresAtMs : undefined
}

export function getApiErrorMessage(input: unknown): string {
	if (typeof input === "string") {
		const message = input.trim()
		return message.length > 0 ? message : REQUEST_FAILED_MESSAGE
	}

	return parseApiErrorBody(input)?.message ?? REQUEST_FAILED_MESSAGE
}

export function extractForgotPasswordPayload(
	input: unknown,
): ForgotPasswordPayload | undefined {
	const envelope = parseApiSuccessBody(input)
	if (envelope === null || !isRecord(envelope.data)) return undefined

	const verificationCodeExpiresMinutes = getNumber(
		envelope.data["verification_code_expires_minutes"],
	)
	const resendCooldownSeconds = getNumber(
		envelope.data["resend_cooldown_seconds"],
	)

	if (
		verificationCodeExpiresMinutes === undefined
		|| resendCooldownSeconds === undefined
	) {
		return undefined
	}

	return { verificationCodeExpiresMinutes, resendCooldownSeconds }
}

export function extractResetPasswordSession(
	input: unknown,
): ResetPasswordSession | undefined {
	const envelope = parseApiSuccessBody(input)
	if (envelope === null || !isRecord(envelope.data)) return undefined

	const keyExpiresMinutes = getNumber(envelope.data["key_expires_minutes"])
	const expiresAtMs = parseExpiresAtMs(envelope.data["key_expires_at"])
	if (keyExpiresMinutes === undefined || expiresAtMs === undefined) {
		return undefined
	}

	return {
		keyExpiresMinutes,
		expiresAtMs,
	}
}

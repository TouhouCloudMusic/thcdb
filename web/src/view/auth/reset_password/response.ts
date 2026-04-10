import { Effect, Schema } from "effect"

import type { ResetPasswordSession } from "./session"

export const REQUEST_FAILED_MESSAGE = "Request failed"

export type AuthApiResponse = {
	status: number
	data: unknown
}

export type RequestFailedError = {
	_tag: "RequestFailedError"
}

export type ResponseStatusError = {
	_tag: "ResponseStatusError"
	message: string
}

export type InvalidResponseError = {
	_tag: "InvalidResponseError"
}

export type ResetPasswordFlowError =
	| InvalidResponseError
	| RequestFailedError
	| ResponseStatusError

export const REQUEST_FAILED_ERROR: RequestFailedError = {
	_tag: "RequestFailedError",
}

const INVALID_RESPONSE_ERROR: InvalidResponseError = {
	_tag: "InvalidResponseError",
}

type ForgotPasswordPayload = {
	verificationCodeExpiresMinutes: number
	resendCooldownSeconds: number
}

const ApiErrorBodySchema = Schema.Struct({
	status: Schema.Literal("Err"),
	message: Schema.String,
})

const ApiSuccessEnvelopeSchema = Schema.Struct({
	status: Schema.Literal("Ok"),
	data: Schema.Unknown,
})

const ForgotPasswordPayloadSchema = Schema.Struct({
	verification_code_expires_minutes: Schema.Number,
	resend_cooldown_seconds: Schema.Number,
})

const ResetPasswordSessionPayloadSchema = Schema.Struct({
	key_expires_minutes: Schema.Number,
	key_expires_at: Schema.String,
})

function decodeUnknownWithSchema<A, I>(
	schema: Schema.Schema<A, I>,
	input: unknown,
) {
	return Effect.try({
		try: () => Schema.decodeUnknownSync(schema)(input),
		catch: () => INVALID_RESPONSE_ERROR,
	})
}

export function getApiErrorMessage(input: unknown): string {
	if (typeof input === "string") {
		const message = input.trim()
		return message.length > 0 ? message : REQUEST_FAILED_MESSAGE
	}

	const result = Schema.decodeUnknownEither(ApiErrorBodySchema)(input)
	if (result._tag === "Left") return REQUEST_FAILED_MESSAGE

	const message = result.right.message.trim()
	return message.length > 0 ? message : REQUEST_FAILED_MESSAGE
}

export function getResetPasswordErrorMessage(error: ResetPasswordFlowError) {
	if (error._tag === "ResponseStatusError") return error.message
	return REQUEST_FAILED_MESSAGE
}

export function ensureSuccessResponse(response: AuthApiResponse) {
	if (response.status === 200) {
		return Effect.succeed(response.data)
	}

	return Effect.fail<ResetPasswordFlowError>({
		_tag: "ResponseStatusError",
		message: getApiErrorMessage(response.data),
	})
}

export function decodeForgotPasswordPayload(input: unknown) {
	return Effect.flatMap(
		decodeUnknownWithSchema(ApiSuccessEnvelopeSchema, input),
		(envelope) =>
			Effect.map(
				decodeUnknownWithSchema(ForgotPasswordPayloadSchema, envelope.data),
				(data): ForgotPasswordPayload => ({
					verificationCodeExpiresMinutes:
						data.verification_code_expires_minutes,
					resendCooldownSeconds: data.resend_cooldown_seconds,
				}),
			),
	)
}

export function decodeResetPasswordSession(input: unknown) {
	return Effect.flatMap(
		decodeUnknownWithSchema(ApiSuccessEnvelopeSchema, input),
		(envelope) =>
			Effect.flatMap(
				decodeUnknownWithSchema(
					ResetPasswordSessionPayloadSchema,
					envelope.data,
				),
				(data) =>
					Effect.try({
						try: (): ResetPasswordSession => {
							const expiresAtMs = Date.parse(data.key_expires_at)
							if (!Number.isFinite(expiresAtMs)) {
								throw new TypeError("Invalid reset password session expiry")
							}

							return {
								keyExpiresMinutes: data.key_expires_minutes,
								expiresAtMs,
							}
						},
						catch: () => INVALID_RESPONSE_ERROR,
					}),
			),
	)
}

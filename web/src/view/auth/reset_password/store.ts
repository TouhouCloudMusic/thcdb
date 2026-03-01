import { createStore } from "solid-js/store"

export type ResetPasswordUiState = {
	sendCodeError?: string
	verifyCodeError?: string
	resetPasswordError?: string
	cooldownSeconds: number
	isSendingCode: boolean
	isVerifyingCode: boolean
	hasSentCode: boolean
	verificationCodeExpiresMinutes?: number
}

export function createResetPasswordUiStore() {
	const [state, setState] = createStore<ResetPasswordUiState>({
		sendCodeError: undefined,
		verifyCodeError: undefined,
		resetPasswordError: undefined,
		cooldownSeconds: 0,
		isSendingCode: false,
		isVerifyingCode: false,
		hasSentCode: false,
		verificationCodeExpiresMinutes: undefined,
	})

	const isCoolingDown = () => state.cooldownSeconds > 0

	function startSendCode() {
		setState({
			sendCodeError: undefined,
			verifyCodeError: undefined,
			isSendingCode: true,
		})
	}
	function endSendCodeWithError(message: string) {
		setState({
			isSendingCode: false,
			sendCodeError: message,
		})
	}
	function endSendCodeWithSuccess() {
		setState({
			isSendingCode: false,
			hasSentCode: true,
			sendCodeError: undefined,
		})
	}

	function startVerifyCode() {
		setState({
			verifyCodeError: undefined,
			isVerifyingCode: true,
		})
	}
	function endVerifyCodeWithError(message: string) {
		setState({
			isVerifyingCode: false,
			verifyCodeError: message,
		})
	}
	function endVerifyCodeWithSuccess() {
		setState({
			isVerifyingCode: false,
			verifyCodeError: undefined,
		})
	}

	function startResetPassword() {
		setState("resetPasswordError", undefined)
	}
	function endResetPasswordWithError(message: string) {
		setState("resetPasswordError", message)
	}

	function setVerificationCodeExpiresMinutes(minutes: number) {
		setState("verificationCodeExpiresMinutes", minutes)
	}

	function resetSendCodeFlow() {
		setState({
			sendCodeError: undefined,
			verifyCodeError: undefined,
			cooldownSeconds: 0,
			isSendingCode: false,
			isVerifyingCode: false,
			hasSentCode: false,
			verificationCodeExpiresMinutes: undefined,
		})
	}

	function setCooldown(seconds: number) {
		setState("cooldownSeconds", seconds)
	}
	function tickCooldown() {
		setState("cooldownSeconds", (current) => (current <= 1 ? 0 : current - 1))
	}

	return {
		state,
		isCoolingDown,
		startSendCode,
		endSendCodeWithError,
		endSendCodeWithSuccess,
		startVerifyCode,
		endVerifyCodeWithError,
		endVerifyCodeWithSuccess,
		startResetPassword,
		endResetPasswordWithError,
		setVerificationCodeExpiresMinutes,
		resetSendCodeFlow,
		setCooldown,
		tickCooldown,
	}
}

export type ResetPasswordUiStore = ReturnType<typeof createResetPasswordUiStore>

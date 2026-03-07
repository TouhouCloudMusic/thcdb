import { getVerificationEmail } from "./session"

export type VerifyEmailState =
	| { type: "inactive"; email?: undefined; seconds?: undefined }
	| {
			type: "missing_session"
			email?: undefined
			seconds?: undefined
	  }
	| { type: "ready"; email: string; seconds?: undefined }
	| { type: "resending"; email: string; seconds?: undefined }
	| { type: "cooldown"; email: string; seconds: number }

export type VerifyEmailEvent =
	| {
			type: "sync"
			mode: "sign_in" | "sign_up" | "verify_email"
	  }
	| {
			type: "seed_after_signup"
			email: string
			cooldownSeconds: number
	  }
	| { type: "start_resend" }
	| { type: "resend_failed" }
	| { type: "resend_success"; cooldownSeconds: number }
	| { type: "tick" }

export function updateVerifyEmailState(
	state: VerifyEmailState,
	event: VerifyEmailEvent,
): VerifyEmailState {
	switch (event.type) {
		case "sync": {
			if (event.mode !== "verify_email") {
				return state.type === "inactive" || state.type === "missing_session"
					? { type: "inactive" }
					: state
			}

			const email = getVerificationEmail()
			if (!email) return { type: "missing_session" }

			if (
				(state.type === "ready"
					|| state.type === "resending"
					|| state.type === "cooldown")
				&& state.email === email
			) {
				return state
			}

			return { type: "ready", email }
		}
		case "seed_after_signup": {
			return {
				type: "cooldown",
				email: event.email,
				seconds: event.cooldownSeconds,
			}
		}
		case "start_resend": {
			if (state.type !== "ready") return state
			return { type: "resending", email: state.email }
		}
		case "resend_failed": {
			if (state.type !== "resending") return state
			return { type: "ready", email: state.email }
		}
		case "resend_success": {
			if (state.type !== "resending") return state
			return {
				type: "cooldown",
				email: state.email,
				seconds: event.cooldownSeconds,
			}
		}
		case "tick": {
			if (state.type !== "cooldown") return state
			if (state.seconds <= 1) {
				return { type: "ready", email: state.email }
			}
			return { ...state, seconds: state.seconds - 1 }
		}
	}

	return state
}

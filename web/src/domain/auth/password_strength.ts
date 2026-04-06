import zxcvbn from "zxcvbn"

export const PASSWORD_STRENGTH_MIN_SCORE = 3

function getPasswordStrength(password: string) {
	return zxcvbn(password, [])
}

export function isPasswordStrongEnough(password: string) {
	return getPasswordStrength(password).score >= PASSWORD_STRENGTH_MIN_SCORE
}

declare module "zxcvbn" {
	type ZXCVBNFeedback = {
		warning: string
		suggestions: string[]
	}

	type ZXCVBNResult = {
		score: number
		feedback: ZXCVBNFeedback
	}

	export default function zxcvbn(
		password: string,
		userInputs?: string[],
	): ZXCVBNResult
}

import type { CorrectionSubmitResult as ApiCorrectionSubmitResult } from "@thc/api"

export type CorrectionSubmitResult = ApiCorrectionSubmitResult

export type EntityCorrectionMutationParams<TData> =
	| { type: "Create"; data: TData }
	| {
			type: "Update"
			id: number
			correctionId?: number
			data: TData
	  }

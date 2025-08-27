import "cropperjs"

import type { ActionType } from "./type"

export type HandleProps = {
	action?: ActionType
	plain?: boolean
	slottable?: boolean
	themeColor?: string
}

export function Handle(props: HandleProps) {
	// @ts-expect-error
	return <cropper-handle {...props} />
}

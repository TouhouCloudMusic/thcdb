import type { JSX } from "solid-js"

import type { ActionType } from "./type"

type CropperAttributes = JSX.HTMLAttributes<HTMLElement>
type CropperChangeAttributes = Omit<CropperAttributes, "onChange"> & {
	onChange?: JSX.EventHandlerUnion<HTMLElement, CustomEvent>
}

declare module "solid-js" {
	namespace JSX {
		interface IntrinsicElements {
			"cropper-canvas": CropperAttributes & {
				background?: boolean
				disabled?: boolean
				scaleStep?: number
				themeColor?: string
			}
			"cropper-crosshair": CropperAttributes & {
				centered?: boolean
				slottable?: boolean
				themeColor?: string
			}
			"cropper-grid": CropperAttributes & {
				rows?: number
				columns?: number
				bordered?: boolean
				covered?: boolean
				slottable?: boolean
				themeColor?: string
			}
			"cropper-handle": CropperAttributes & {
				action?: ActionType
				plain?: boolean
				slottable?: boolean
				themeColor?: string
			}
			"cropper-image": CropperAttributes & {
				"initial-center-size"?: "contain" | "cover"
			}
			"cropper-selection": CropperChangeAttributes & {
				x?: number
				y?: number
				width?: number
				height?: number
				"aspect-ratio"?: number
				"initial-aspect-ratio"?: number
				"initial-coverage"?: number
				dynamic?: boolean
				movable?: boolean
				resizable?: boolean
				zoomable?: boolean
				multiple?: boolean
				keyboard?: boolean
				outlined?: boolean
				precise?: boolean
			}
			"cropper-shade": CropperAttributes
			"cropper-viewer": CropperAttributes & {
				resize?: "both" | "horizontal" | "vertical" | "none"
				selection?: string
				slottable?: boolean
			}
		}
	}
}

export {}

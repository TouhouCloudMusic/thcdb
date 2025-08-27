import "cropperjs"

export type CropperCrosshairProps = {
	centered?: boolean
	slottable?: boolean
	themeColor?: string
}

export function CropperCrosshair(props: CropperCrosshairProps) {
	// @ts-expect-error
	return <cropper-crosshair {...props} />
}

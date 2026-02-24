import "cropperjs"

export type CropperCrosshairProps = {
	centered?: boolean
	slottable?: boolean
	themeColor?: string
}

export function CropperCrosshair(props: CropperCrosshairProps) {
	return <cropper-crosshair {...props}></cropper-crosshair>
}

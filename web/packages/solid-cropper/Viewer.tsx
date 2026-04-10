import "cropperjs"

export type ResizeDirection = "both" | "horizontal" | "vertical" | "none"

export type ViewerProps = {
	resize?: ResizeDirection
	selection?: string
	slottable?: boolean
}

export function Viewer(props: ViewerProps) {
	return <cropper-viewer {...props}></cropper-viewer>
}

import "cropperjs"

export type ResizeDirection = "both" | "horizontal" | "vertical" | "none"

export type ViewerProps = {
	resize?: ResizeDirection
	selection?: string
	slottable?: boolean
}

export function Viewer(props: ViewerProps) {
	// @ts-expect-error
	return <cropper-viewer {...props} />
}

import "cropperjs"

export type GridProps = {
	rows?: number
	columns?: number
	bordered?: boolean
	covered?: boolean
	slottable?: boolean
	themeColor?: string
}

export function Grid(props: GridProps) {
	// @ts-expect-error
	return <cropper-grid {...props} />
}

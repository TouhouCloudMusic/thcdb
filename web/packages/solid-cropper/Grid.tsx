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
	return <cropper-grid {...props}></cropper-grid>
}

// oxlint-disable ban-types
// oxlint-disable no-unsafe-function-type

export type ShadowRootMode = "open" | "closed"

export type ActionType =
	| "select"
	| "move"
	| "scale"
	| "rotate"
	| "transform"
	| "n-resize"
	| "e-resize"
	| "s-resize"
	| "w-resize"
	| "ne-resize"
	| "nw-resize"
	| "se-resize"
	| "sw-resize"
	| "none"

export type TransformationMatrix = [
	number,
	number,
	number,
	number,
	number,
	number,
]

// Selection interface
export interface Selection {
	x: number
	y: number
	width: number
	height: number
}

// Event detail interfaces
export interface ActionEventDetail {
	action: ActionType
	relatedEvent: PointerEvent | TouchEvent | MouseEvent | WheelEvent
	scale?: number
	rotate?: number
	startX?: number
	startY?: number
	endX?: number
	endY?: number
}

export interface TransformEventDetail {
	matrix: TransformationMatrix
	oldMatrix: TransformationMatrix
}

// oxlint-disable-next-line no-empty-interface
export interface ChangeEventDetail extends Selection {}

// Cropper options
export interface CropperOptions {
	container?: Element | string
	template?: string
}

// Base CropperElement interface
export interface CropperElement extends HTMLElement {
	shadowRootMode?: ShadowRootMode
	slottable?: boolean
	themeColor?: string

	$getShadowRoot(): ShadowRoot
	$addStyles(styles: string): CSSStyleSheet | HTMLStyleElement
	$emit(type: string, detail?: unknown, options?: CustomEventInit): boolean
	$nextTick(callback?: Function): Promise<void>

	readonly $name: string
	readonly $version: string
}

// CropperHandle interface
export interface CropperHandle extends CropperElement {
	// Properties
	action: ActionType
	plain: boolean
	slottable: boolean
	themeColor: string
}

// CropperSelection interface
export interface CropperSelection extends CropperElement, Selection {
	// Properties
	aspectRatio: number
	initialAspectRatio: number
	initialCoverage: number
	dynamic: boolean
	movable: boolean
	resizable: boolean
	zoomable: boolean
	multiple: boolean
	keyboard: boolean
	outlined: boolean
	precise: boolean

	// Methods
	$center(): CropperSelection
	$move(x: number, y?: number): CropperSelection
	$moveTo(x: number, y?: number): CropperSelection
	$resize(
		action: ActionType,
		offsetX?: number,
		offsetY?: number,
		aspectRatio?: number,
	): CropperSelection
	$zoom(scale: number, x?: number, y?: number): CropperSelection
	$change(
		x: number,
		y: number,
		width?: number,
		height?: number,
		aspectRatio?: number,
	): CropperSelection
	$reset(): CropperSelection
	$clear(): CropperSelection
	$render(): CropperSelection
	$toCanvas(options?: CanvasOptions): Promise<HTMLCanvasElement>
}

// CropperGrid interface
export interface CropperGrid extends CropperElement {
	// Properties
	rows: number
	columns: number
	bordered: boolean
	covered: boolean
	slottable: boolean
	themeColor: string
}

// CropperCrosshair interface
export interface CropperCrosshair extends CropperElement {
	// Properties
	centered: boolean
	slottable: boolean
	themeColor: string
}

// CropperViewer interface
export interface CropperViewer extends CropperElement {
	// Properties
	resize: ResizeDirection
	selection: string
	slottable: boolean
}

// Main Cropper class
export interface Cropper {
	// Properties
	element: HTMLImageElement | HTMLCanvasElement
	options: CropperOptions
	container: Element

	// Methods
	getCropperCanvas(): CropperCanvas | null
	getCropperImage(): CropperImage | null
	getCropperSelection(): CropperSelection | null
	getCropperSelections(): NodeListOf<CropperSelection> | null
}

// Constructor type
export type CropperConstructor = new (
	element: HTMLImageElement | HTMLCanvasElement | string,
	options?: CropperOptions,
) => Cropper

import { FileField } from "@kobalte/core/file-field"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { unknownToError } from "@thc/toolkit"
import { CropperSelection } from "cropperjs"
import { Cropper } from "solid-cropper"
import type { JSX, ParentProps } from "solid-js"
import {
	createContext,
	createEffect,
	createSignal,
	Match,
	onCleanup,
	Show,
	Switch,
} from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import {
	AVATAR_MAX_FILE_SIZE,
	AVATAR_MIN_FILE_SIZE,
	REQUEST_BODY_MAX_SIZE,
} from "~/constant/server"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { getImageBounds, getImageScale } from "./cropperImageUtils"
import { ensureCropperSelectionChangeBounded } from "./cropperSelectionPatch"
import type { FileSizeRange } from "./utils"
import { formatBytes, validateImageFile } from "./utils"

const styles = stylex.create({
	dialog: {
		width: "min(56rem,calc(100vw - 2rem))",
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		boxShadow:
			"0 20px 25px -5px rgb(0 0 0 / .1), 0 8px 10px -6px rgb(0 0 0 / .1)",
	},
	header: {
		display: "flex",
		alignItems: "flex-end",
		justifyContent: "space-between",
		gap: px[16],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
		padding: px[16],
	},
	title: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		color: colors.textPrimary,
	},
	close: { paddingInline: px[12] },
	content: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	grid: { display: "grid", gap: px[16] },
	dropzoneTitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
	},
	select: { paddingInline: px[16] },
	toolbar: { display: "flex", alignItems: "center", gap: px[8] },
	replace: {
		marginLeft: "auto",
		paddingInline: px[12],
		alignSelf: "flex-end",
	},
	remove: { paddingInline: px[12], alignSelf: "flex-end" },
	actions: { display: "grid", gridTemplateColumns: "1fr auto" },
	messages: {
		display: "flex",
		flexDirection: "column",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	error: {
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.reimu[200],
		paddingInline: px[12],
		paddingBlock: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[800],
	},
	save: { height: "fit-content", width: px[96] },
	cropper: { height: "100%", width: "100%" },
	canvas: {
		height: "100%",
		width: "100%",
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / .05)",
	},
	dropzone: {
		display: "flex",
		height: px[224],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.md,
		borderWidth: "2px",
		borderStyle: "dashed",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		color: palette.slate[600],
		flexDirection: "column",
		gap: px[12],
		paddingInline: px[24],
		textAlign: "center",
	},
})

type OutputSize = { width: number; height: number }
type ComputeOutputSize = (
	rawWidth: number,
	rawHeight: number,
) => OutputSize | undefined

type ImageFileType = "image/png" | "image/jpeg"

type ImageCropDialogState = {
	previewSrc?: string
	fileName: string
	fileSize: number
	isFileSelected: boolean
	localError?: string
}

type ImageCropDialogActions = {
	onFileChange: (details: { acceptedFiles: File[] }) => void
	clearLocalState: () => void
	handleSave: () => Promise<void>
	handleImageTransform: JSX.EventHandlerUnion<HTMLElement, CustomEvent>
	setCropperRoot: (root: HTMLDivElement | undefined) => void
}

type ImageCropDialogMeta = {
	ratio: number | undefined
	error?: string
	busy: boolean
	canSave: boolean
}

type ImageCropDialogContextValue = ImageCropDialogState
	& ImageCropDialogActions
	& ImageCropDialogMeta

const ImageCropDialogContext = createContext<ImageCropDialogContextValue>()

const useImageCropDialog = () =>
	assertContext(ImageCropDialogContext, "ImageCropDialog")

const DEFAULT_FILE_SIZE_RANGE: FileSizeRange = {
	min: AVATAR_MIN_FILE_SIZE,
	max: AVATAR_MAX_FILE_SIZE,
}

function computeOutputSizeFromSelection(options: {
	host: HTMLDivElement
	selection: CropperSelection
	computeOutputSize: (
		rawWidth: number,
		rawHeight: number,
	) => OutputSize | undefined
}): OutputSize | undefined {
	const selectionWidth = options.selection.width
	const selectionHeight = options.selection.height
	if (!Number.isFinite(selectionWidth) || !Number.isFinite(selectionHeight))
		return undefined
	if (selectionWidth <= 0 || selectionHeight <= 0) return undefined

	const scale = getImageScale(options.host)
	if (!scale) return undefined

	const rawWidth = selectionWidth / scale.scaleX
	const rawHeight = selectionHeight / scale.scaleY
	if (!Number.isFinite(rawWidth) || rawWidth <= 0) return undefined
	if (!Number.isFinite(rawHeight) || rawHeight <= 0) return undefined

	return options.computeOutputSize(rawWidth, rawHeight)
}

export type RootProps = ParentProps & {
	open: boolean
	syncOpen: (state: boolean) => void
	ratio?: number
	fileSizeRange?: FileSizeRange
	computeOutputSize: ComputeOutputSize
	busy: boolean
	error?: string | undefined
	onSave: (file: File) => Promise<void>
	title: string
}

export function Root(props: RootProps) {
	const { t } = useLingui()
	const [cropperRoot, setCropperRoot] = createSignal<HTMLDivElement>()
	const [isSelectionReady, setSelectionReady] = createSignal(false)
	const fileSizeRange = () => {
		const range = props.fileSizeRange ?? DEFAULT_FILE_SIZE_RANGE
		return {
			min: range.min,
			max: Math.min(range.max, REQUEST_BODY_MAX_SIZE),
		}
	}

	let lastObjectUrl: string | undefined
	let isClampQueued = false

	const [state, setState] = createStore<
		ImageCropDialogState & { inputFileType: ImageFileType }
	>({
		previewSrc: undefined,
		fileName: "image",
		fileSize: 0,
		isFileSelected: false,
		localError: undefined,
		inputFileType: "image/png",
	})

	const clearFileState = () => {
		setCropperRoot(undefined)
		setSelectionReady(false)
		setState({
			fileName: "image",
			fileSize: 0,
			isFileSelected: false,
			inputFileType: "image/png",
			previewSrc: undefined,
		})
		if (lastObjectUrl) {
			globalThis.URL.revokeObjectURL(lastObjectUrl)
			lastObjectUrl = undefined
		}
	}

	const clearLocalState = () => {
		setState("localError", undefined)
		clearFileState()
	}

	const syncOpen = (isOpen: boolean) => {
		props.syncOpen(isOpen)
		if (!isOpen) {
			clearLocalState()
		}
	}

	const onFileChange = (details: { acceptedFiles: File[] }) => {
		setState("localError", undefined)

		const file = details.acceptedFiles[0]
		if (!file) {
			clearLocalState()
			return
		}

		const validationError = validateImageFile(file, fileSizeRange(), {
			unsupportedType: t`Only PNG/JPEG images are supported.`,
			tooSmall: (minimum) => t`File is too small. Minimum is ${{ minimum }}.`,
			tooLarge: (maximum) => t`File is too large. Maximum is ${{ maximum }}.`,
		})
		if (validationError) {
			clearFileState()
			setState("localError", validationError)
			return
		}

		setCropperRoot(undefined)
		setState({
			fileName: file.name,
			fileSize: file.size,
			isFileSelected: true,
			inputFileType: file.type === "image/jpeg" ? "image/jpeg" : "image/png",
		})

		if (lastObjectUrl) {
			globalThis.URL.revokeObjectURL(lastObjectUrl)
			lastObjectUrl = undefined
		}

		const url = globalThis.URL.createObjectURL(file)
		lastObjectUrl = url
		setState("previewSrc", undefined)
		globalThis.queueMicrotask(() => {
			if (lastObjectUrl !== url) return
			setState("previewSrc", url)
		})
	}

	createEffect(() => {
		const host = cropperRoot()
		const src = state.previewSrc
		if (!host || !src) {
			setSelectionReady(false)
			return
		}

		const ratio = props.ratio
		globalThis.queueMicrotask(() => {
			const selection = host.querySelector("cropper-selection")
			if (!(selection instanceof CropperSelection)) {
				setSelectionReady(false)
				return
			}
			setSelectionReady(selection.isConnected)

			ensureCropperSelectionChangeBounded({
				selection,
				ratio,
				getBounds: () => getImageBounds(host),
			})

			selection.$change(
				selection.x,
				selection.y,
				selection.width,
				selection.height,
				ratio,
				true,
			)
		})
	})

	const getCroppedFile = async () => {
		const host = cropperRoot()
		if (!host) {
			return {
				ok: false as const,
				message: t`Cropper is not ready yet.`,
			}
		}

		const selection = host.querySelector("cropper-selection")
		if (!(selection instanceof CropperSelection)) {
			return {
				ok: false as const,
				message: t`Cropper is not ready yet.`,
			}
		}

		const computeOutputSize = props.computeOutputSize

		const outputSize = computeOutputSizeFromSelection({
			host,
			selection,
			computeOutputSize,
		})
		if (!outputSize) {
			return {
				ok: false as const,
				message: t({
					message:
						"Selected crop cannot satisfy the required dimensions. Adjust the crop area.",
				}),
			}
		}

		let canvas: unknown
		try {
			canvas = await selection.$toCanvas(outputSize)
		} catch (err) {
			return {
				ok: false as const,
				message: t`Crop failed.`,
				cause: err,
			}
		}

		if (!(canvas instanceof HTMLCanvasElement)) {
			return { ok: false as const, message: t`Crop failed.` }
		}

		const outputType = state.inputFileType
		const outputExt = outputType === "image/jpeg" ? "jpg" : "png"

		let blob: Blob | null
		try {
			blob = await new Promise<Blob | null>((resolve, reject) => {
				try {
					if (outputType === "image/jpeg") {
						canvas.toBlob(resolve, outputType, 0.92)
					} else {
						canvas.toBlob(resolve, outputType)
					}
				} catch (err) {
					reject(unknownToError(err))
				}
			})
		} catch (err) {
			return {
				ok: false as const,
				message: t`Crop failed.`,
				cause: err,
			}
		}

		if (!blob) {
			return { ok: false as const, message: t`Crop failed.` }
		}

		if (blob.size > fileSizeRange().max) {
			return {
				ok: false as const,
				message: `Cropped image is too large (${formatBytes(blob.size)}). Try a smaller crop or use a smaller source image.`,
			}
		}

		return {
			ok: true as const,
			file: new File([blob], `crop.${outputExt}`, { type: blob.type }),
		}
	}

	const handleSave = async () => {
		setState("localError", undefined)

		const cropResult = await getCroppedFile()
		if (!cropResult.ok) {
			setState("localError", cropResult.message)
			return
		}

		try {
			await props.onSave(cropResult.file)
			syncOpen(false)
		} catch (err) {
			if (err instanceof Error && err.message) {
				setState("localError", err.message)
			} else {
				setState("localError", t`Upload failed.`)
			}
		}
	}

	const handleImageTransform: JSX.EventHandlerUnion<
		HTMLElement,
		CustomEvent
	> = () => {
		if (isClampQueued) return
		isClampQueued = true

		const host = cropperRoot()
		if (!host) {
			isClampQueued = false
			return
		}

		const ratio = props.ratio

		globalThis.queueMicrotask(() => {
			isClampQueued = false

			const selection = host.querySelector("cropper-selection")
			if (!(selection instanceof CropperSelection)) return
			ensureCropperSelectionChangeBounded({
				selection,
				ratio,
				getBounds: () => getImageBounds(host),
			})

			selection.$change(
				selection.x,
				selection.y,
				selection.width,
				selection.height,
				ratio,
				true,
			)
		})
	}

	onCleanup(() => {
		if (lastObjectUrl) {
			globalThis.URL.revokeObjectURL(lastObjectUrl)
			lastObjectUrl = undefined
		}
	})

	const contextValue: ImageCropDialogContextValue = {
		get previewSrc() {
			return state.previewSrc
		},
		get fileName() {
			return state.fileName
		},
		get fileSize() {
			return state.fileSize
		},
		get isFileSelected() {
			return state.isFileSelected
		},
		get localError() {
			return state.localError
		},
		onFileChange,
		clearLocalState,
		handleSave,
		handleImageTransform,
		setCropperRoot: (root) => {
			setCropperRoot(root)
		},
		get ratio() {
			return props.ratio
		},
		get error() {
			return props.error
		},
		get busy() {
			return props.busy
		},
		get canSave() {
			if (props.busy) return false
			if (!state.previewSrc) return false
			if (!isSelectionReady()) return false

			const host = cropperRoot()
			if (!host) return false

			const selection = host.querySelector("cropper-selection")
			return selection instanceof CropperSelection && selection.isConnected
		},
	}

	return (
		<ImageCropDialogContext.Provider value={contextValue}>
			<Dialog.Root
				open={props.open}
				onOpenChange={syncOpen}
			>
				<Dialog.Portal>
					<Dialog.Overlay data-blur />
					<Dialog.Content styles={styles.dialog}>
						<Header title={props.title} />
						<Content>{props.children}</Content>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</ImageCropDialogContext.Provider>
	)
}

type HeaderProps = {
	title: string
}

function Header(props: HeaderProps) {
	return (
		<div {...stylex.attrs(styles.header)}>
			<Dialog.Title styles={styles.title}>{props.title}</Dialog.Title>
			<Dialog.CloseButton
				appearance="outline"
				tone="gray"
				size="sm"
				styles={styles.close}
			>
				Close
			</Dialog.CloseButton>
		</div>
	)
}

type ContentProps = ParentProps

function Content(props: ContentProps) {
	const { t } = useLingui()
	const context = useImageCropDialog()
	const errorMessage = () => context.localError ?? context.error

	return (
		<div {...stylex.attrs(styles.content)}>
			<FileField
				{...stylex.attrs(styles.grid)}
				multiple={false}
				accept="image/png,image/jpeg"
				onFileChange={context.onFileChange}
			>
				<Show
					when={context.isFileSelected && context.previewSrc}
					keyed
					fallback={
						<FileField.Dropzone {...stylex.attrs(styles.dropzone)}>
							<div {...stylex.attrs(styles.dropzoneTitle)}>
								Drop an image here, or pick a file
							</div>
							<FileField.Trigger
								as={Button}
								appearance="surface"
								tone="reimu"
								size="sm"
								styles={styles.select}
							>
								Select file
							</FileField.Trigger>
						</FileField.Dropzone>
					}
				>
					<FileField.ItemList>
						{(_) => (
							<div {...stylex.attrs(styles.grid)}>
								<div {...stylex.attrs(styles.toolbar)}>
									<FileField.Trigger
										as={Button}
										appearance="outline"
										tone="gray"
										size="xs"
										styles={styles.replace}
									>
										Replace
									</FileField.Trigger>
									<FileField.ItemDeleteTrigger
										as={Button}
										appearance="outline"
										tone="gray"
										size="xs"
										styles={styles.remove}
										onClick={() => {
											context.clearLocalState()
										}}
									>
										Remove
									</FileField.ItemDeleteTrigger>
								</div>

								{props.children}
							</div>
						)}
					</FileField.ItemList>
				</Show>

				<FileField.HiddenInput />
			</FileField>
			<div {...stylex.attrs(styles.actions)}>
				<div {...stylex.attrs(styles.messages)}>
					<Show when={errorMessage()}>
						{(error) => <div {...stylex.attrs(styles.error)}>{error()}</div>}
					</Show>
				</div>
				<Button
					appearance="solid"
					tone="reimu"
					size="sm"
					styles={styles.save}
					disabled={!context.canSave}
					onClick={() => {
						if (!context.canSave) return
						void context.handleSave()
					}}
				>
					<Switch>
						<Match when={context.busy}>{t`Uploading…`}</Match>
						<Match when={!context.busy}>{t`Save`}</Match>
					</Switch>
				</Button>
			</div>
		</div>
	)
}

export type CanvasProps = {
	styles?: StyleXStyles
}

export function Canvas(props: CanvasProps) {
	const context = useImageCropDialog()

	return (
		<div
			ref={(el) => {
				context.setCropperRoot(el)
			}}
			{...stylex.attrs(styles.canvas, props.styles)}
		>
			<Cropper.Canvas
				background
				{...stylex.attrs(styles.cropper)}
			>
				<Cropper.Image
					src={context.previewSrc}
					alt={context.fileName}
					initialCenterSize="contain"
					scalable
					translatable
					onTransform={context.handleImageTransform}
				/>
				<Cropper.Shade hidden />
				<Cropper.Handle
					action="select"
					plain
				/>
				<Cropper.Selection
					aspectRatio={context.ratio}
					initialCoverage={1}
					movable
					resizable
					zoomable
					outlined
					dynamic
					keyboard
					precise
				>
					<Cropper.CropperCrosshair centered />
					<Cropper.Handle
						action="move"
						// plain
					/>
					<Cropper.Handle action="n-resize" />
					<Cropper.Handle action="e-resize" />
					<Cropper.Handle action="s-resize" />
					<Cropper.Handle action="w-resize" />
					<Cropper.Handle action="ne-resize" />
					<Cropper.Handle action="nw-resize" />
					<Cropper.Handle action="se-resize" />
					<Cropper.Handle action="sw-resize" />
				</Cropper.Selection>
			</Cropper.Canvas>
		</div>
	)
}

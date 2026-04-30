import { FileField } from "@kobalte/core/file-field"
import { useLingui } from "@lingui/solid/macro"
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
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { AVATAR_MAX_FILE_SIZE, AVATAR_MIN_FILE_SIZE } from "~/constant/server"
import { assertContext } from "~/utils/solid/assertContext"

import { getImageBounds, getImageScale } from "./cropperImageUtils"
import { ensureCropperSelectionChangeBounded } from "./cropperSelectionPatch"
import type { FileSizeRange } from "./utils"
import { formatBytes, validateImageFile } from "./utils"

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

const DROPZONE_CLASS =
	"flex h-56 items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-white text-slate-600"

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
	const fileSizeRange = () => props.fileSizeRange ?? DEFAULT_FILE_SIZE_RANGE

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

		let blob: Blob | null = null
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
					<Dialog.Content class="w-[min(56rem,calc(100vw-2rem))] rounded-md border border-slate-300 bg-white shadow-xl">
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
		<div class="flex items-end justify-between gap-4 border-b border-slate-300 bg-slate-50 p-4">
			<Dialog.Title class="text-lg font-light text-primary">
				{props.title}
			</Dialog.Title>
			<Dialog.CloseButton
				variant="SecondaryV2"
				size="Sm"
				class="px-3"
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
		<div class="flex flex-col gap-2 p-4">
			<FileField
				class="grid gap-4"
				multiple={false}
				accept="image/png,image/jpeg"
				onFileChange={context.onFileChange}
			>
				<Show
					when={context.isFileSelected && context.previewSrc}
					keyed
					fallback={
						<FileField.Dropzone
							class={twMerge(DROPZONE_CLASS, "flex-col gap-3 px-6 text-center")}
						>
							<div class="text-sm font-medium">
								Drop an image here, or pick a file
							</div>
							<FileField.Trigger
								as={Button}
								variant="PrimaryV2"
								color="Reimu"
								size="Sm"
								class="px-4"
							>
								Select file
							</FileField.Trigger>
						</FileField.Dropzone>
					}
				>
					<FileField.ItemList>
						{(_) => (
							<div class="grid gap-4">
								<div class="flex items-center gap-2">
									<FileField.Trigger
										as={Button}
										variant="SecondaryV2"
										size="Xs"
										class="ml-auto px-3 self-end"
									>
										Replace
									</FileField.Trigger>
									<FileField.ItemDeleteTrigger
										as={Button}
										variant="SecondaryV2"
										size="Xs"
										class="px-3 self-end"
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
			<div class="grid grid-cols-[1fr_auto]">
				<div class="flex flex-col text-sm">
					<Show when={errorMessage()}>
						{(error) => (
							<div class="rounded-md border border-reimu-200 bg-reimu-50 px-3 py-2 text-sm text-reimu-800">
								{error()}
							</div>
						)}
					</Show>
				</div>
				<Button
					variant="Primary"
					color="Reimu"
					size="Sm"
					class="size-fit w-24"
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
	class: string
}

export function Canvas(props: CanvasProps) {
	const context = useImageCropDialog()

	return (
		<div
			ref={(el) => {
				context.setCropperRoot(el)
			}}
			class={twMerge(
				"size-full rounded-md border border-slate-300 shadow-xs",
				props.class,
			)}
		>
			<Cropper.Canvas
				background
				class="h-full w-full"
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

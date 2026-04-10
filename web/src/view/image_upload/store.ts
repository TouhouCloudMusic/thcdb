import { onCleanup } from "solid-js"
import { createStore } from "solid-js/store"

export type EntityImageUploadStoreOptions = {
	onUpload: (file: File) => Promise<void>
	initialDraftFile?: File
	initialDraftPreviewUrl?: string
}

export type EntityImageUploadStore = {
	isOpen: boolean
	setIsOpen: (next: boolean) => void
	draftPreviewUrl: string | undefined
	hasDraft: boolean
	submitError: string | undefined
	isUploading: boolean
	onOpen: () => void
	onDraftSave: (file: File) => Promise<void>
	onSubmit: () => Promise<void>
}

type EntityImageUploadState = {
	isOpen: boolean
	draftFile: File | undefined
	draftPreviewUrl: string | undefined
	shouldRevokeDraftPreviewUrl: boolean
	submitError: string | undefined
	isUploading: boolean
}

function getSubmitErrorMessage(error: unknown) {
	if (error instanceof Error && error.message) {
		return error.message
	}

	return "Submit failed."
}

function revokeDraftPreviewUrl(url: string | undefined, shouldRevoke: boolean) {
	if (!url || !shouldRevoke) return
	globalThis.URL.revokeObjectURL(url)
}

export function createEntityImageUploadStore(
	options: EntityImageUploadStoreOptions,
): EntityImageUploadStore {
	const initialDraftPreviewUrl = options.initialDraftFile
		? globalThis.URL.createObjectURL(options.initialDraftFile)
		: options.initialDraftPreviewUrl
	const shouldRevokeDraftPreviewUrl = options.initialDraftFile !== undefined

	const [state, setState] = createStore<EntityImageUploadState>({
		isOpen: false,
		draftFile: options.initialDraftFile,
		draftPreviewUrl: initialDraftPreviewUrl,
		shouldRevokeDraftPreviewUrl,
		submitError: undefined,
		isUploading: false,
	})

	const setIsOpen = (next: boolean) => {
		setState("isOpen", next)
	}

	const setDraft = (file: File) => {
		revokeDraftPreviewUrl(
			state.draftPreviewUrl,
			state.shouldRevokeDraftPreviewUrl,
		)
		setState({
			draftFile: file,
			draftPreviewUrl: globalThis.URL.createObjectURL(file),
			shouldRevokeDraftPreviewUrl: true,
			submitError: undefined,
		})
	}

	const onOpen = () => {
		if (state.isUploading) return
		setIsOpen(true)
	}

	const onDraftSave = (file: File) => {
		setDraft(file)
		return Promise.resolve()
	}

	const onSubmit = async () => {
		const file = state.draftFile
		if (!file || state.isUploading) return

		setState({
			isUploading: true,
			submitError: undefined,
		})

		try {
			await options.onUpload(file)
		} catch (error) {
			setState("submitError", getSubmitErrorMessage(error))
		} finally {
			setState("isUploading", false)
		}
	}

	onCleanup(() => {
		revokeDraftPreviewUrl(
			state.draftPreviewUrl,
			state.shouldRevokeDraftPreviewUrl,
		)
	})

	return {
		get isOpen() {
			return state.isOpen
		},
		setIsOpen,
		get draftPreviewUrl() {
			return state.draftPreviewUrl
		},
		get hasDraft() {
			return state.draftPreviewUrl !== undefined
		},
		get submitError() {
			return state.submitError
		},
		get isUploading() {
			return state.isUploading
		},
		onOpen,
		onDraftSave,
		onSubmit,
	}
}

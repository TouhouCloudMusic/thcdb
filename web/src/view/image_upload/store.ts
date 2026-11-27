import { onCleanup } from "solid-js"
import { createStore, produce } from "solid-js/store"

import { getErrorMessage } from "~/utils/getErrorMessage"

export type EntityImageUploadStoreOptions = {
	onUpload: (submission: { file: File; description: string }) => Promise<void>
	initialDraftFile?: File
	initialDraftPreviewUrl?: string
	submitFailedMessage?: string
}

export type EntityImageUploadStore = {
	isOpen: boolean
	setIsOpen: (next: boolean) => void
	draftPreviewUrl: string | undefined
	hasDraft: boolean
	description: string
	setDescription: (description: string) => void
	canSubmit: boolean
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
	description: string
	submitError: string | undefined
	isUploading: boolean
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
		description: "",
		submitError: undefined,
		isUploading: false,
	})

	const setIsOpen = (next: boolean) => {
		setState(
			produce((draft) => {
				draft.isOpen = next
			}),
		)
	}

	const setDraft = (file: File) => {
		revokeDraftPreviewUrl(
			state.draftPreviewUrl,
			state.shouldRevokeDraftPreviewUrl,
		)
		const previewUrl = globalThis.URL.createObjectURL(file)
		setState(
			produce((draft) => {
				draft.draftFile = file
				draft.draftPreviewUrl = previewUrl
				draft.shouldRevokeDraftPreviewUrl = true
				draft.submitError = undefined
			}),
		)
	}

	const onOpen = () => {
		if (state.isUploading) return
		setIsOpen(true)
	}

	const onDraftSave = (file: File) => {
		setDraft(file)
		return Promise.resolve()
	}

	const setDescription = (description: string) => {
		setState(
			produce((draft) => {
				draft.description = description
				draft.submitError = undefined
			}),
		)
	}

	const submittableFile = () =>
		state.isUploading || !state.description.trim() ? undefined : state.draftFile

	const onSubmit = async () => {
		const file = submittableFile()
		if (!file) return

		setState(
			produce((draft) => {
				draft.isUploading = true
				draft.submitError = undefined
			}),
		)

		try {
			await options.onUpload({ file, description: state.description })
		} catch (error) {
			const fallback = options.submitFailedMessage ?? "Submit failed."
			setState(
				produce((draft) => {
					draft.submitError = getErrorMessage(error, fallback) || fallback
				}),
			)
		} finally {
			setState(
				produce((draft) => {
					draft.isUploading = false
				}),
			)
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
		get description() {
			return state.description
		},
		setDescription,
		get canSubmit() {
			return submittableFile() !== undefined
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

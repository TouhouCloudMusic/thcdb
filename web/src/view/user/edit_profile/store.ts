import { t } from "@lingui/core/macro"
import type { Accessor } from "solid-js"
import { createStore } from "solid-js/store"

export type EditProfileStoreOptions = {
	baseBio: Accessor<string>
	saveBio: (next: string) => Promise<void>
	uploadAvatar: (file: File) => Promise<void>
	uploadBanner: (file: File) => Promise<void>
}

export type EditProfileBioState = {
	value: string
	isDirty: boolean
	isSaving: boolean
	error: string | undefined
	savedAt: string | undefined
}

export type EditProfileBioStore = EditProfileBioState & {
	onInput: (next: string) => void
	onReset: () => void
	onSave: () => Promise<void>
}

export type EditProfileImageState = {
	isOpen: boolean
	isUploading: boolean
	error: string | undefined
}

export type EditProfileImageStore = {
	isOpen: boolean
	setIsOpen: (next: boolean) => void
	isUploading: boolean
	error: string | undefined
	onUpload: (file: File) => Promise<void>
}

export type EditProfileStore = {
	bio: EditProfileBioStore
	avatar: EditProfileImageStore
	banner: EditProfileImageStore
}

type BioState = {
	draft: string | undefined
	isSaving: boolean
	error: string | undefined
	savedAt: string | undefined
}

function createImageStore(
	upload: (file: File) => Promise<void>,
): EditProfileImageStore {
	const [state, setState] = createStore<EditProfileImageState>({
		isOpen: false,
		isUploading: false,
		error: undefined,
	})

	const setIsOpen = (next: boolean) => {
		setState("isOpen", next)
	}

	const onUpload = async (file: File) => {
		if (state.isUploading) return

		setState({ error: undefined, isUploading: true })
		try {
			await upload(file)
		} catch (err) {
			if (err instanceof Error && err.message) {
				setState("error", err.message)
				throw err
			}
			const msg = t`Upload failed.`
			setState("error", msg)
			throw new Error(msg, { cause: err })
		} finally {
			setState("isUploading", false)
		}
	}

	return {
		get isOpen() {
			return state.isOpen
		},
		setIsOpen,
		get isUploading() {
			return state.isUploading
		},
		get error() {
			return state.error
		},
		onUpload,
	}
}

export const createEditProfileStore = (
	options: EditProfileStoreOptions,
): EditProfileStore => {
	const [bioState, setBioState] = createStore<BioState>({
		draft: undefined,
		isSaving: false,
		error: undefined,
		savedAt: undefined,
	})

	const getBio = () => bioState.draft ?? options.baseBio()
	const getIsBioDirty = () => bioState.draft !== undefined

	return {
		bio: {
			get value() {
				return getBio()
			},
			get isDirty() {
				return getIsBioDirty()
			},
			get isSaving() {
				return bioState.isSaving
			},
			get error() {
				return bioState.error
			},
			get savedAt() {
				return bioState.savedAt
			},
			onInput: (next: string) => {
				setBioState({
					error: undefined,
					draft: next === options.baseBio() ? undefined : next,
				})
			},
			onReset: () => {
				setBioState({
					error: undefined,
					draft: undefined,
				})
			},
			onSave: async () => {
				if (!getIsBioDirty() || bioState.isSaving) return

				const next = getBio()
				setBioState({ error: undefined, isSaving: true })
				try {
					await options.saveBio(next)
					setBioState({
						draft: undefined,
						savedAt: new Date().toISOString(),
					})
				} catch (err) {
					if (err instanceof Error && err.message) {
						setBioState("error", err.message)
					} else {
						setBioState("error", t`Save failed.`)
					}
				} finally {
					setBioState("isSaving", false)
				}
			},
		},
		avatar: createImageStore(options.uploadAvatar),
		banner: createImageStore(options.uploadBanner),
	}
}

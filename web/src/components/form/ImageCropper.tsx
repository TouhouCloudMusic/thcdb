import { FileField } from "@kobalte/core/file-field"
import type Croppie from "croppie"
import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show,
  useContext,
} from "solid-js"
import { createStore } from "solid-js/store"
import {
  CloudArrowUpIcon,
  CheckIcon,
} from "~/components/icons/heroicons/24/outline"
import { createCroppie } from "~/lib/adapter/croppie"
import { deepMerge } from "~/lib/object"
import { createUrl } from "~/lib/reactivity"
import { type NestedPartial } from "~/types"
import { createAtom } from "~/utils/createAtom"

import { Button } from "../button"

import "croppie/croppie.css"

export type ImageDropProps<DeepMerge extends boolean = true> = {
  /** @param base64 the base64 string of the image */
  onSave: (base64: string) => void
  onImageLoad?: () => void
  onImageRemove?: () => void

  croppieOption?: DeepMerge extends true ? NestedPartial<Croppie.CroppieOptions>
  : Partial<Croppie.CroppieOptions>
  /** @default true */
  deepMergeCroppieOption?: DeepMerge | undefined
}

const DEFAULT_OPTION: Croppie.CroppieOptions = {
  viewport: {
    width: 200,
    height: 200,
    type: "square",
  },
  boundary: {
    width: 200 + 100,
    height: 200 + 100,
  },
  enableOrientation: true,
  enableZoom: true,
  mouseWheelZoom: true,
  showZoomer: true,
}

type ImageDropStore = {
  isUploading: boolean
  setIsUploading: (value: boolean) => void
  error?: string
  onError: (error: unknown) => void
  onFileChange: (file?: File) => void
  croppedImage?: string
  fileInputRef?: HTMLInputElement
  setFileInputRef: (el: HTMLInputElement) => void
} & (
  | {
      file?: undefined
      fileUrl: () => undefined
    }
  | {
      file: File
      fileUrl: () => string
    }
)

const Context = createContext<ImageDropStore>()

export function ImageCropper<T extends boolean = true>(
  props: ImageDropProps<T>,
) {
  const croppieContainerRef = createAtom<HTMLElement>()

  const croppieOptions = createMemo<Croppie.CroppieOptions>(() => {
    if (!props.croppieOption) {
      return DEFAULT_OPTION
    }

    if (props.deepMergeCroppieOption ?? true) {
      return deepMerge(
        DEFAULT_OPTION as Croppie.CroppieOptions & Record<string, unknown>,
        props.croppieOption,
      )
    } else {
      return Object.assign({}, DEFAULT_OPTION, props.croppieOption)
    }
  })

  const [store, setStore] = createStore<ImageDropStore>({
    isUploading: false,
    fileUrl() {
      return fileUrlMemo()
    },
    setIsUploading: (value) => setStore("isUploading", value),
    onFileChange(file) {
      setStore("file", file)
    },
    onError(err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setStore("error", message)
    },
    setFileInputRef(el) {
      setStore("fileInputRef", el)
    },
  })

  const fileUrlMemo = createUrl(() => store.file)

  // bug https://github.com/solidjs-community/eslint-plugin-solid/issues/182
  // eslint-disable-next-line solid/reactivity
  const croppie = createCroppie(croppieContainerRef, croppieOptions)

  const onSave = async () => {
    if (!croppie()) return

    try {
      const result = await croppie()!.result({
        type: "base64",
        size: "original",
        format: "png",
        quality: 1,
      })
      setStore("croppedImage", result)
      props.onSave(result)
    } catch (e) {
      store.onError(e)
    }
  }

  createEffect(() => {
    if (store.file) {
      let onLoad = props.onImageLoad
      void croppie()
        ?.bind({ url: store.fileUrl() })
        .then(() => {
          onLoad?.()
        })
        .catch(store.onError)
    } else {
      props.onImageRemove?.()
    }
  })

  return (
    <Context.Provider value={store}>
      <FileField
        onFileChange={(detail) => {
          const file = detail.acceptedFiles[0]
          store.onFileChange(file)
        }}
      >
        <Show when={store.error}>
          <div class="mb-4 text-reimu-500">{store.error}</div>
        </Show>
        <FileField.ItemList>
          {(_) => (
            <FileField.Item>
              <FileField.ItemDeleteTrigger>Delete</FileField.ItemDeleteTrigger>
            </FileField.Item>
          )}
        </FileField.ItemList>
        <Show
          when={store.file}
          fallback={<ImageDropZone />}
        >
          <div>
            <div class="pt-6">
              <div ref={croppieContainerRef}></div>
            </div>
            <Button
              class="flex w-full items-center justify-center gap-2 px-4"
              variant="Primary"
              color="Reimu"
              onClick={() => onSave()}
              disabled={store.isUploading}
            >
              <CheckIcon class="-ml-0.5 h-5 w-5 text-white" />
              Save
            </Button>
          </div>
        </Show>
        <FileField.HiddenInput
          ref={store.setFileInputRef}
          disabled={store.isUploading}
        />
      </FileField>
    </Context.Provider>
  )
}

function ImageDropZone() {
  const dropZoneRef = createAtom<HTMLElement>()

  const [isDragOver, setDragOver] = createSignal(false)
  const onDragOver = (event: Event) => {
    const isInside =
      dropZoneRef() ? event.composedPath().includes(dropZoneRef()!) : false
    setDragOver(isInside)
  }

  const context = useContext(Context)!

  onMount(() => {
    document.addEventListener("dragover", onDragOver)
    onCleanup(() => {
      document.removeEventListener("dragover", onDragOver)
    })
  })

  return (
    <>
      <FileField.Dropzone
        ref={dropZoneRef}
        class={`${isDragOver() && "bg-slate-100"} ${context.isUploading && "opacity-50"} m-2 size-96 place-content-center place-items-center rounded-md border-2 border-dashed border-slate-300 p-2 sm:flex`}
      >
        <div>
          <CloudArrowUpIcon class="h-48 w-48 text-slate-300" />
          <div class="mt-4 flex flex-col justify-center text-sm leading-6 text-slate-600">
            <FileField.Trigger
              as={Button}
              variant="Primary"
              color="Reimu"
              disabled={context.isUploading}
            >
              Upload Image
            </FileField.Trigger>
            <p class="mt-2 text-center text-xs leading-5 text-slate-600">
              PNG, JPG, GIF up to 10MB
            </p>
          </div>
        </div>
      </FileField.Dropzone>
    </>
  )
}

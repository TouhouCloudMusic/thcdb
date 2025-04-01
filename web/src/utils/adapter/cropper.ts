/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Selection } from "@cropper/element-selection"
import {
  type CropperCanvas,
  type CropperImage,
  type CropperSelection,
} from "cropperjs"
import { createEffect, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"

type Matrix2D = [number, number, number, number, number, number]
type WithIn = "image" | "canvas" | "none"
type CropperLimitBoundStore = {
  readonly setCanvasRef: (elm: HTMLElement) => void
  readonly setImageRef: (elm: HTMLElement) => void
  readonly setSelectionRef: (elm: HTMLElement) => void
}
type InternalCropperLimitBoundStore = CropperLimitBoundStore & {
  canvas?: CropperCanvas
  image?: CropperImage
  selection?: CropperSelection
  withIn: WithIn
}
export function createCropperBoundary(
  withIn: WithIn = "none",
): CropperLimitBoundStore {
  let [store, setStore] = createStore<InternalCropperLimitBoundStore>({
    withIn,
    setCanvasRef: (canvas: HTMLElement) => {
      setStore("canvas", canvas)
    },
    setImageRef: (image: HTMLElement) => {
      setStore("image", image)
    },
    setSelectionRef: (selection: HTMLElement) => {
      setStore("selection", selection)
    },
  })

  function inSelection(selection: Selection, maxSelection: Selection) {
    return (
      selection.x >= maxSelection.x &&
      selection.y >= maxSelection.y &&
      selection.x + selection.width <= maxSelection.x + maxSelection.width &&
      selection.y + selection.height <= maxSelection.y + maxSelection.height
    )
  }

  function onCropperImageTransform(event: Event) {
    const cropperCanvas = store.canvas

    if (!cropperCanvas || store.withIn !== "image") return

    const cropperCanvasRect = cropperCanvas.getBoundingClientRect()

    // 1. Clone the cropper image.
    const cropperImageClone = store.image!.cloneNode() as CropperImage

    // 2. Apply the new matrix to the cropper image clone.
    cropperImageClone.style.transform = `matrix(${(event.detail.matrix as Matrix2D).join(", ")})`

    // 3. Make the cropper image clone invisible.
    cropperImageClone.style.opacity = "0"

    // 4. Append the cropper image clone to the cropper canvas.
    cropperCanvas.appendChild(cropperImageClone)

    // 5. Compute the boundaries of the cropper image clone.
    const cropperImageRect = cropperImageClone.getBoundingClientRect()

    // 6. Remove the cropper image clone.
    cropperCanvas.removeChild(cropperImageClone)

    let canvasH = cropperImageRect.width
    let canvasW = cropperImageRect.height
    let xOffset = cropperImageRect.left - cropperCanvasRect.left
    let yOffset = cropperImageRect.top - cropperCanvasRect.top

    const maxSelection: Selection = {
      x: xOffset,
      y: yOffset,
      width: canvasH,
      height: canvasW,
    }

    if (!inSelection(store.selection as Selection, maxSelection)) {
      event.preventDefault()
    }
  }

  type MyMatrix2d = {
    sx: number // X 方向缩放
    sy: number // Y 方向缩放
    tx: number // X 方向平移
    ty: number // Y 方向平移
  }
  function computeMaxMatrix2D(
    matrix: MyMatrix2d,
    {
      newWidth,
      newHeight,
      canvasWidth,
      canvasHeight,
      xOffset,
      yOffset,
    }: {
      newWidth: number // 变换后的宽度
      newHeight: number // 变换后的高度
      canvasWidth?: number // 目标画布宽度，可选
      canvasHeight?: number // 目标画布高度，可选
      xOffset: number
      yOffset: number
    },
  ): MyMatrix2d {
    const originalWidth = newWidth / matrix.sx
    const originalHeight = newHeight / matrix.sy

    let scaleFactor = 1 // 默认不缩放

    if (canvasWidth !== undefined && canvasHeight !== undefined) {
      // 计算适配画布的缩放因子
      scaleFactor = Math.min(
        canvasWidth / originalWidth,
        canvasHeight / originalHeight,
      )
    }
    // 计算新的变换矩阵
    let sx = Math.max(matrix.sx * scaleFactor, 1)
    let sy = Math.max(matrix.sy * scaleFactor, 1)
    return {
      sx,
      sy,
      tx: matrix.tx + xOffset, // 这里 tx, ty 可调整为适应新画布
      ty: matrix.ty + yOffset,
    }
  }

  const onCropperSelectionChange = (event: Event) => {
    const cropperCanvas = store.canvas

    if (!cropperCanvas || store.withIn === "none") {
      return
    }

    const cropperCanvasRect = cropperCanvas.getBoundingClientRect()
    const selection = event.detail as Selection

    switch (store.withIn) {
      case "canvas": {
        const maxSelection: Selection = {
          x: 0,
          y: 0,
          width: cropperCanvasRect.width,
          height: cropperCanvasRect.height,
        }

        if (!inSelection(selection, maxSelection)) {
          event.preventDefault()
        }
        break
      }

      case "image": {
        const cropperImage = store.image
        const cropperImageRect = cropperImage!.getBoundingClientRect()
        const maxSelection: Selection = {
          x: cropperImageRect.left - cropperCanvasRect.left,
          y: cropperImageRect.top - cropperCanvasRect.top,
          width: cropperImageRect.width,
          height: cropperImageRect.height,
        }

        if (!inSelection(selection, maxSelection)) {
          // event.preventDefault()
        }
        break
      }

      default:
    }
  }

  createEffect(() => {
    if (store.image) {
      store.image.addEventListener("transform", onCropperImageTransform)
    }

    onCleanup(() => {
      store.image?.removeEventListener("transform", onCropperImageTransform)
    })
  })
  createEffect(() => {
    if (store.selection) {
      store.selection.addEventListener("change", onCropperSelectionChange)
    }

    onCleanup(() => {
      store.selection?.removeEventListener("change", onCropperSelectionChange)
    })
  })

  return store
}

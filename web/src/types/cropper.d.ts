import { type JSX } from "solid-js"

type CanvasActionScale = "scale"
type CanvasActionOther =
  | "transform"
  | "select"
  | "move"
  | "rotate"
  | "n-resize"
  | "e-resize"
  | "s-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
type CanvasAction = CanvasActionScale | CanvasActionOther

type CropperElementProps = {
  "shadow-root-mode"?: "open" | "closed"
  slottable?: boolean
  "theme-color"?: string
} & JSX.HTMLAttributes<HTMLElement>
interface CropperElement extends HTMLElement, CropperElementProps {}

type CropperImageProps = CropperElementProps &
  Pick<
    JSX.ImgHTMLAttributes<HTMLImageElement>,
    | "alt"
    | "crossorigin"
    | "decoding"
    | "loading"
    | "referrerpolicy"
    | "sizes"
    | "src"
    | "srcset"
  > & {
    /**
     * @default "contain"
     * @description Indicates the initial size of the image when aligned with the center of its parent element.
     */
    "initial-center-size"?: "contain" | "cover"

    rotatable?: boolean
    scalable?: boolean
    skewable?: boolean
    slottable?: boolean
    translatable?: boolean

    "on:transform"?: (event: CustomEvent) => void
  }

type CropperSelectionProps = CropperElementProps & {
  children?: JSX.Element

  x?: number
  y?: number
  width?: number
  height?: number

  "aspect-ratio"?: number
  "initial-aspect-ratio"?: number
  "initial-coverage"?: number

  dynamic?: boolean
  movable?: boolean
  resizable?: boolean
  zoomable?: boolean

  multiple?: boolean
  keyboard?: boolean
  outlined?: boolean
  precise?: boolean
}

declare module "solid-js" {
  namespace JSX {
    interface IntrinsicElements {
      "cropper-canvas": CropperElementProps & {
        background?: boolean
      }

      "cropper-image": CropperImageProps
      "cropper-shade": CropperElementProps & {
        hidden?: boolean
      }
      "cropper-selection": CropperSelectionProps
      "cropper-grid": CropperElementProps & {
        role?: string
        covered?: boolean
      }
      "cropper-crosshair": CropperElementProps & {
        centered?: boolean
      }
      "cropper-handle": CropperElementProps & {
        action?: CanvasAction

        plain?: boolean
      }
    }
  }
}

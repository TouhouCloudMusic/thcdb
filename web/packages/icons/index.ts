import type { JSX } from "solid-js"
import type * as Radix from "solid-radix-icons"

export type IconProps = JSX.SvgSVGAttributes<SVGSVGElement>
	& Partial<Radix.IconProps>

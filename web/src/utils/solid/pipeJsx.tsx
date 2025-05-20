import type { ParentComponent, ParentProps } from "solid-js"

export function pipeJsx(...comps: ParentComponent[]) {
	return (props: ParentProps) => {
		// eslint-disable-next-line solid/reactivity
		let ret = props.children
		for (const Comp of comps.reverse()) {
			ret = <Comp>{props.children}</Comp>
		}

		return ret
	}
}

import type { ComponentProps } from "solid-js"
import { Suspense } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Intersperse } from "~/component/data/Intersperse"

export type Contributor = {
	id: number
	name: string
}

type EntityContributorsProps = {
	contributors: Contributor[]
	class?: ComponentProps<"div">["class"]
}

export function EntityContributors(props: EntityContributorsProps) {
	return (
		<div class={props.class ?? "flex flex-wrap text-sm"}>
			<div class="font-medium text-tertiary whitespace-pre">Contributors: </div>
			<p class="text-primary wrap-break-word">
				<Suspense fallback={<>Loading contributors...</>}>
					<Intersperse
						of={props.contributors}
						with={<span class="whitespace-pre">, </span>}
					>
						{(contributor) => (
							<Link
								to="/profile/$username"
								params={{ username: contributor.name }}
							>
								{contributor.name}
							</Link>
						)}
					</Intersperse>
				</Suspense>
			</p>
		</div>
	)
}

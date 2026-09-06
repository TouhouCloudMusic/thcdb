import { useLingui } from "@lingui/solid/macro"
import { For, Show } from "solid-js"

export function ExternalLinks(props: {
	links?: readonly string[] | null
	class?: string
	labelClass?: string
}) {
	const { t } = useLingui()

	return (
		<Show when={props.links?.length}>
			<div class={props.class}>
				<span
					class={props.labelClass ?? "text-sm text-tertiary"}
				>{t`Links`}</span>
				<ul>
					<For each={props.links}>
						{(link) => (
							<li>
								<a
									class="text-blue-600"
									href={link}
									target="_blank"
									rel="noopener noreferrer"
								>
									{link}
								</a>
							</li>
						)}
					</For>
				</ul>
			</div>
		</Show>
	)
}

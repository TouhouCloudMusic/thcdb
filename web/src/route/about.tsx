import { useLingui } from "@lingui/solid/macro"
import { Title } from "@solidjs/meta"
import { createFileRoute } from "@tanstack/solid-router"

export const Route = createFileRoute("/about")({
	component: About,
})

function About() {
	const { t } = useLingui()
	return (
		<>
			<Title>{t`About`}</Title>
			<h1>{t`About`}</h1>
		</>
	)
}

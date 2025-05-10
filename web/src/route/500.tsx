import { Title } from "@solidjs/meta"

export default function InternalServerError(props: {
	msg?: string | undefined
}) {
	return (
		<main class="w-5xl py-32">
			<Title>Internal Server Error</Title>
			<img
				src="/img/status_code/500.png"
				alt="500 Internal Server Error"
			/>
			<div>{props.msg}</div>
		</main>
	)
}

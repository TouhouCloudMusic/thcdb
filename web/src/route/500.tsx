import { Title } from "@solidjs/meta"
import { HttpStatusCode } from "@solidjs/start"

export default function InternalServerError(props: { msg?: string }) {
	return (
		<main class="w-[64rem] py-32">
			<Title>Internal Server Error</Title>
			<HttpStatusCode code={500} />
			<img
				src="/img/status_code/500.png"
				alt="500 Internal Server Error"
			/>
			<div>{props.msg}</div>
		</main>
	)
}

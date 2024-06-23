import { Title } from "@solidjs/meta"
import { HttpStatusCode } from "@solidjs/start"

export default function NotFound() {
	return (
		<main class="w-[64rem] py-32">
			<Title>Not Found</Title>
			<HttpStatusCode code={404} />
			<img
				src="/img/status_code/404.png"
				alt="404 Not Found"
			/>
		</main>
	)
}

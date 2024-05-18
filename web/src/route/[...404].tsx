import { Title } from "@solidjs/meta";
import { HttpStatusCode } from "@solidjs/start";

export default function NotFound() {
	return (
		<main class="flex h-full w-full items-center justify-center bg-white">
			<Title>Not Found</Title>
			<HttpStatusCode code={404} />
			<div>404 Not Found</div>
		</main>
	);
}

import { Title } from "@solidjs/meta"

export function NotFound() {
	return (
		<div class="flex size-full py-32">
			<Title>404 Not Found</Title>
			<img
				class="m-auto w-3/4"
				src="/img/status_code/404.png"
				alt="404 Not Found"
			/>
		</div>
	)
}

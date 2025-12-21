import { Title } from "@solidjs/meta"

export function NotFound() {
	return (
		<div class="flex size-full py-32">
			<Title>404 Not Found</Title>
			<div class="m-auto text-center">
				<img
					class="m-auto w-1/3"
					src="/img/status_code/404.png"
					alt="404 Not Found"
				/>
				<h1 class="mt-4 text-4xl">404 Not Found</h1>
				<p class="mt-2 text-slate-600">
					The page you are looking for does not exist.
				</p>
				<p class="mt-1 text-slate-400">
					Hey you, lost one. why you are here?{" "}
					<a
						class="text-blue-400 hover:underline"
						href="/"
					>
						You should go back...
					</a>
				</p>
			</div>
		</div>
	)
}

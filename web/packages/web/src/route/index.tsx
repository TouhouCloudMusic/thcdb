import { Title } from "@solidjs/meta"

export default function HomePage() {
	const linkClass = "text-blue-800 hover:text-blue-700 dark:text-blue-900"

	return (
		<main class="flex justify-center">
			<div class="w-[60rem]">
				<Title>Hello World</Title>
				<ul class="my-2 flex flex-col gap-2">
					<li>
						<a
							href="/song/example"
							class="link">
							song
						</a>
					</li>
					<li>
						<a
							href="/user/dev"
							class="link">
							user
						</a>
					</li>
					<li>
						<a
							href="/theme"
							class="link">
							theme
						</a>
					</li>
				</ul>
			</div>
		</main>
	)
}

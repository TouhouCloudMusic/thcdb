import { Title } from "@solidjs/meta"

export default function HomePage() {
	return (
		<main class="flex justify-center">
			<div class="w-[60rem] bg-white">
				<Title>Hello World</Title>
				<h1 class="text-gray-1000">Hello world!</h1>
				<ul class="my-2 flex flex-col">
					<li>
						<a
							href="/song/example"
							class="text-gray-1000">
							song
						</a>
					</li>
					<li>
						<a
							href="/user/dev"
							class="text-gray-1000">
							user
						</a>
					</li>
					<li>
						<a
							href="/theme"
							class="text-gray-1000">
							theme
						</a>
					</li>
				</ul>
			</div>
		</main>
	)
}

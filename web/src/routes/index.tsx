import { Title } from "@solidjs/meta";

export default function HomePage() {
	return (
		<main class="flex justify-center">
			<div class="w-[60rem] bg-white">
				<Title>Hello World</Title>
				<h1>Hello world!</h1>
				<ul class="flex">
					<li>
						<a href="/song/example">song</a>
					</li>
				</ul>
			</div>
		</main>
	);
}

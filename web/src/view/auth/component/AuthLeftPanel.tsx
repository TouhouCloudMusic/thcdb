const AUTH_LEFT_PANEL_TITLE = "Lorem ipsum dolor sit amet consectetur"
const AUTH_LEFT_PANEL_DESCRIPTION =
	"Lorem ipsum dolor sit, amet consectetur adipisicing elit. Exercitationem earum ipsam tempora, aut fugiat"

export function AuthLeftPanel() {
	return (
		<div class="hidden lg:flex flex-col justify-center gap-6 px-8 py-12 xl:px-14">
			<div class="flex gap-3">
				<img
					src="/logo.svg"
					alt=""
					class="h-10 w-10"
				/>
				<div class="flex flex-col leading-none">
					<div class="text-xs font-medium tracking-[0.22em] text-secondary">
						TOUHOU CLOUD DB
					</div>
					<div class="text-xs text-tertiary">
						Lorem ipsum dolor sit amet consectetur
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<h1 class="text-5xl font-light tracking-tighter text-primary">
					{AUTH_LEFT_PANEL_TITLE}
				</h1>
				<h2 class="text-xl text-tertiary">{AUTH_LEFT_PANEL_DESCRIPTION}</h2>
			</div>

			<div class="grid gap-3 pt-2 text-sm text-secondary">
				<div class="flex items-center gap-2">
					<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
					<span>Add missing entries (artists, releases, songs, events)</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
					<span>Submit corrections and keep metadata clean</span>
				</div>
				<div class="flex items-center gap-2">
					<span class="inline-block size-1.5 rounded-full bg-reimu-600"></span>
					<span>Sync your contributions across devices</span>
				</div>
			</div>
		</div>
	)
}

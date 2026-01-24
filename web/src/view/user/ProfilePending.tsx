import { PageLayout } from "~/layout/PageLayout"

export function ProfilePending() {
	return (
		<PageLayout class="min-h-full">
			<div class="grid min-h-[60vh] place-items-center px-6 py-14">
				<div class="rounded-sm border border-slate-300 bg-white px-5 py-4 text-sm text-slate-500 shadow-xs">
					Loading profile...
				</div>
			</div>
		</PageLayout>
	)
}

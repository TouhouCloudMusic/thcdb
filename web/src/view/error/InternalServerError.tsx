import { useLingui } from "@lingui/solid/macro"
import { Title } from "@solidjs/meta"

export function InternalServerError(props: { msg?: string | undefined }) {
	const { t } = useLingui()
	return (
		<div class="flex size-full py-32">
			<Title>{t`500 Internal Server Error`}</Title>
			<div class="m-auto text-center">
				<img
					class="m-auto w-1/3"
					src="/img/status_code/500.png"
					alt={t`500 Internal Server Error`}
				/>
				<h1 class="mt-4 text-4xl">{t`500 Internal Server Error`}</h1>
				<p class="mt-2 break-words text-slate-600">{props.msg}</p>
				<p class="mt-1 text-slate-400">
					<button
						type="button"
						class="text-blue-400 hover:underline"
						onClick={() => history.back()}
					>
						Go back...
					</button>
				</p>
			</div>
		</div>
	)
}

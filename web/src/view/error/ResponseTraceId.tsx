import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { CopyIcon } from "@thc/icons/radix"
import { createSignal, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import { infoStyles } from "~/style/primitives"
import { colors, fonts, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		marginTop: px[16],
		fontSize: fontSizes.sm,
		color: colors.textTertiary,
		textAlign: "center",
	},
	row: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "center",
		gap: px[8],
	},
	value: {
		maxWidth: "100%",
		overflowWrap: "anywhere",
		fontFamily: fonts.mono,
	},
	copyButton: {
		width: px[28],
		height: px[28],
		padding: 0,
	},
})

type ResponseTraceIdProps = {
	traceId: string
}

export function ResponseTraceId(props: ResponseTraceIdProps) {
	const { t } = useLingui()
	const [copied, setCopied] = createSignal<boolean>()
	const copyTraceId = async () => {
		try {
			await globalThis.navigator.clipboard.writeText(props.traceId)
			setCopied(true)
		} catch {
			setCopied(false)
		}
	}

	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.row)}>
				<span {...stylex.attrs(infoStyles.label)}>{t`Trace ID`}</span>
				<code {...stylex.attrs(infoStyles.detail, styles.value)}>
					{props.traceId}
				</code>
				<Button
					appearance="ghost"
					size="sm"
					styles={styles.copyButton}
					aria-label={t`Copy trace ID`}
					onClick={() => void copyTraceId()}
				>
					<Button.Icon>
						<CopyIcon aria-hidden="true" />
					</Button.Icon>
				</Button>
			</div>
			<output>
				<Show when={copied() !== undefined}>
					{copied() ? t`Trace ID copied` : t`Could not copy trace ID`}
				</Show>
			</output>
		</div>
	)
}

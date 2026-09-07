import { Trans, useLingui } from "@lingui/solid/macro"
import { Title } from "@solidjs/meta"
import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	page: {
		display: "flex",
		width: "100%",
		height: "100%",
		paddingBlock: px[128],
	},
	content: { margin: "auto", textAlign: "center" },
	illustration: { margin: "auto", width: "33.33333333333333%" },
	title: {
		marginTop: px[16],
		fontSize: fontSizes["4xl"],
		lineHeight: lineHeights["4xl"],
	},
	message: { marginTop: px[8], color: palette.slate[600] },
	hint: { marginTop: px[4], color: palette.slate[400] },
	link: {
		color: palette.blue[400],
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

export function NotFound() {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.page)}>
			<Title>{t`404 Not Found`}</Title>
			<div {...stylex.attrs(styles.content)}>
				<img
					{...stylex.attrs(styles.illustration)}
					src="/img/status_code/404.png"
					alt={t`404 Not Found`}
				/>
				<h1 {...stylex.attrs(styles.title)}>{t`404 Not Found`}</h1>
				<p {...stylex.attrs(styles.message)}>
					{t`The page you are looking for does not exist.`}
				</p>
				<p {...stylex.attrs(styles.hint)}>
					<Trans>
						Hey you, lost one. why you are here?{" "}
						<a
							{...stylex.attrs(styles.link)}
							href="/"
						>
							You should go back...
						</a>
					</Trans>
				</p>
			</div>
		</div>
	)
}

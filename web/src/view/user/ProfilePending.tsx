import * as stylex from "@stylexjs/stylex"

import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	page: { minHeight: "100%" },
	content: {
		display: "grid",
		minHeight: "60vh",
		placeItems: "center",
		paddingInline: px[24],
		paddingBlock: px[56],
	},
	message: {
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		paddingInline: px[20],
		paddingBlock: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
})

export function ProfilePending() {
	return (
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.content)}>
				<div {...stylex.attrs(styles.message)}>Loading profile...</div>
			</div>
		</PageLayout>
	)
}

import { Trans } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import { radius, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: px[16],
	},
	preview: {
		width: "100%",
		height: px[256],
		borderWidth: 2,
		borderStyle: "dashed",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	save: {
		paddingInline: px[16],
		paddingBlock: px[8],
		backgroundColor: palette.blue[600],
		color: palette.white,
		borderRadius: radius.sm,
	},
})

export type ImageDropProps = {
	croppieOption?: unknown
	onSave: (base64: string) => void
}

export function ImageCropper(props: ImageDropProps) {
	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.preview)}>
				<p>
					<Trans>Image Cropper Placeholder</Trans>
				</p>
			</div>
			<button
				type="button"
				{...stylex.attrs(styles.save)}
				onClick={() => props.onSave("data:image/png;base64,...")}
			>
				<Trans>Save Image</Trans>
			</button>
		</div>
	)
}

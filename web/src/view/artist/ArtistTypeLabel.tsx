import { useLingui } from "@lingui/solid/macro"

import type { ArtistListItem } from "~/hey-api"

export function ArtistTypeLabel(props: {
	value: "" | ArtistListItem["artist_type"]
}) {
	const { t } = useLingui()

	const label = () => {
		switch (props.value) {
			case "": {
				return t`All`
			}
			case "Solo": {
				return t`Solo Artist`
			}
			case "Multiple": {
				return t`Group`
			}
			case "Unknown": {
				return t`Unknown`
			}
		}
	}

	return <>{label()}</>
}

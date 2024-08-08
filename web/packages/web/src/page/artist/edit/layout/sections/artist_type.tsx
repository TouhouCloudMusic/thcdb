import { FormUI } from "~/component/form/ui"
import { useController } from "../../context.tsx"
import * as Style from "../style.ts"

export function ArtistType() {
	const { initData, artistType, t, Field } = useController()
	return (
		<div class="flex flex-col">
			<h4 class={Style.label}>{t.artist_type()}</h4>
			<div class="h-12 w-24">
				<Field name="artist_type">
					{(field, props) => (
						<>
							<div class="flex">
								<input
									{...props}
									type="radio"
									id="artist_type_person"
									value="Person"
									checked={initData()?.artist_type === "Person"}
									onChange={() => artistType.toPerson()}
								/>
								<label for="artist_type_person">{t.person()}</label>
							</div>
							<div class="flex">
								<input
									{...props}
									type="radio"
									id="artist_type_group"
									value="Group"
									checked={field.value === "Group"}
									onChange={() => artistType.toGroup()}
								/>
								<label for="artist_type_group">{t.group()}</label>
							</div>
							{field.error && <FormUI.ErrorText text={field.error} />}
						</>
					)}
				</Field>
			</div>
		</div>
	)
}

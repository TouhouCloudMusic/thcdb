import { NotSignedIn, AuthForm } from "./component"

export function Auth() {
	return (
		<NotSignedIn>
			<AuthForm />
		</NotSignedIn>
	)
}

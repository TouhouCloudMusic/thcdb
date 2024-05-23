// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server"
import { initSSRTheme } from "./server/initTheme"

export default createHandler(
	() => {
		return (
			<StartServer
				document={({ assets, children, scripts }) => (
					<html
						lang="en"
						data-mode={initSSRTheme()}>
						<head>
							<meta charset="utf-8" />
							<meta
								name="viewport"
								content="width=device-width, initial-scale=1"
							/>
							<link
								rel="icon"
								href="/logo.svg"
							/>
							{assets}
						</head>
						<body>
							<div
								id="app"
								class="notransition">
								{children}
							</div>
							{scripts}
						</body>
					</html>
				)}
			/>
		)
	},
	{ mode: "stream" }
)

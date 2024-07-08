// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server"
import { initSSRTheme } from "./server/init_theme"

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
							<div id="app">{children}</div>
							{scripts}
						</body>
					</html>
				)}
			/>
		)
	},
	{ mode: "async" }
)

export const hooks = {
	/** @param {{name: string, peerDependencies?: Record<string, string>, dependencies?: Record<string, string>}} pkg */
	readPackage(pkg) {
		let version
		switch (pkg.name) {
			case "@hey-api/openapi-ts":
			case "openapi-typescript":
			case "@ark/attest":
			case "@typescript-eslint/typescript-estree":
			case "@typescript-eslint/project-service":
			case "@typescript-eslint/tsconfig-utils":
			case "@typescript-eslint/utils": {
				version = "npm:@typescript/typescript6@^6.0.2"
				break
			}
			default: {
				return pkg
			}
		}

		delete pkg.peerDependencies?.typescript
		pkg.dependencies = { ...pkg.dependencies, typescript: version }

		return pkg
	},
}

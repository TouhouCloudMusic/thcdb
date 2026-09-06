{
  description = "Touhou Cloud DB dev env (root)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    llm-agents.url = "github:numtide/llm-agents.nix";
  };

  outputs =
    inputs@{
      self,
      fenix,
      nixpkgs,
      ...
    }:
    # TODO: Re-enable "aarch64-darwin" after implementing a macOS-compatible
    # Schemathesis environment and Playwright platform configuration.
    {
      devShells = nixpkgs.lib.genAttrs [ "x86_64-linux" "aarch64-linux" ] (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            overlays = [
              fenix.overlays.default
              inputs.llm-agents.overlays.shared-nixpkgs
            ];
          };
          webPackage = builtins.fromJSON (builtins.readFile ./web/package.json);
          webPlaywrightVersion = webPackage.devDependencies.playwright;

          python = pkgs.python3;
          schemathesis = pkgs.buildFHSEnv {
            name = "schemathesis";
            targetPkgs =
              pkgs': with pkgs'; [
                python3
                uv
              ];
            runScript = pkgs.writeShellScript "schemathesis-fhs" ''
              export UV_NO_MANAGED_PYTHON=1
              exec uvx schemathesis "$@"
            '';
          };
        in
        assert
          pkgs.playwright-driver.version == webPlaywrightVersion
          || throw ''
            Playwright version mismatch:
            nix: ${pkgs.playwright-driver.version}
            node: ${webPlaywrightVersion}
          '';
        {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [ openssl ];
            packages = with pkgs; [
              actionlint
              dprint
              just
              just-lsp
              nodejs_22
              pnpm_11
              prek
              sea-orm-cli
              typescript-go
              ty
              uv
              python
              ruff
              playwright-driver.browsers
              (pkgs.fenix.complete.withComponents [
                "cargo"
                "clippy"
                "rust-src"
                "rustc-codegen-cranelift-preview"
                "rustfmt"
              ])
              rust-analyzer-nightly
              clang
              mold
              pkg-config
              schemathesis
              llm-agents.agent-browser
            ];
            shellHook = ''
              export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
              export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
              export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
              export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu-24.04"

              export UV_PYTHON_PREFERENCE="only-system";
              export UV_PYTHON=${python}
            '';
          };
        }
      );
    };
}

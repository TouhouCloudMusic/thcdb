{
  description = "Touhou Cloud DB dev env (root)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-utils = {
      url = "github:numtide/flake-utils";
    };
    llm-agents.url = "github:numtide/llm-agents.nix";
  };

  outputs =
    inputs@{
      self,
      fenix,
      nixpkgs,
      flake-utils,
      ...
    }:
    (flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            fenix.overlays.default
            inputs.llm-agents.overlays.default
          ];
        };

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
      {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            playwright
            playwright-driver.browsers
          ];
          buildInputs = with pkgs; [
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
            openssl
            pkg-config
            schemathesis
            llm-agents.agent-browser
          ];
          packages = with pkgs; [
            dprint
            just
            sea-orm-cli
            just-lsp
            nodejs_22
            typescript-go
            pnpm
            oxlint
          ];
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="ubuntu-24.04"
          '';
        };
      }
    ));
}

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
        prekOverlay = final: prev: {
          prek = prev.rustPlatform.buildRustPackage (finalAttrs: {
            pname = "prek";
            version = "0.3.3";

            src = prev.fetchFromGitHub {
              owner = "j178";
              repo = "prek";
              tag = "v${finalAttrs.version}";
              hash = "sha256-qeJtdPwWOV43RN0sLHU7TP15ajI1o53SoyNP8/sQA04=";
            };

            cargoHash = "sha256-Wb+Ld1tgqc2jcbBHh8hNGZ4amAY8rSRik3VNJEmGc/w=";
            doCheck = false;
            doInstallCheck = false;
          });
        };
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            fenix.overlays.default
            inputs.llm-agents.overlays.default
            prekOverlay
          ];
        };
        webPackage = builtins.fromJSON (builtins.readFile ./web/package.json);
        webPlaywrightVersion = webPackage.devDependencies.playwright;

        python = pkgs.python3.withPackages (pythonPkgs: [
          pythonPkgs.bashlex
        ]);
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
      assert pkgs.playwright-driver.version == webPlaywrightVersion || throw ''
          Playwright version mismatch:
          nix: ${pkgs.playwright-driver.version}
          node: ${webPlaywrightVersion}
        '';
      {
        devShell = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
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
    ));
}

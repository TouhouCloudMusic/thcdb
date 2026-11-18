{
  description = "Touhou Cloud DB dev env (root)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    just-lsp = {
      url = "github:terror/just-lsp/0.11.2";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    llm-agents.url = "github:numtide/llm-agents.nix";
  };

  outputs =
    inputs@{
      self,
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
            overlays = [ inputs.llm-agents.overlays.shared-nixpkgs ];
          };
          webPackage = builtins.fromJSON (builtins.readFile ./web/package.json);
          webPlaywrightVersion = webPackage.devDependencies.playwright;
          npmArch =
            {
              x86_64-linux = "x64";
              aarch64-linux = "arm64";
            }
            .${system};

          just = pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
            pname = "just";
            # Keep in sync with .github/workflows/web.yml.
            version = "1.59.0";
            src = pkgs.fetchurl {
              url = "https://github.com/casey/just/releases/download/${finalAttrs.version}/just-${finalAttrs.version}-${pkgs.stdenv.hostPlatform.parsed.cpu.name}-unknown-linux-musl.tar.gz";
              hash =
                {
                  x86_64-linux = "sha256-QJBEYXtvBlF8EDXlXKOMjIVv+LZQ5BvCqh74LVkDoj4=";
                  aarch64-linux = "sha256-I4cbFwK/1VD7X5AXeP1CkOzy7gNKRaiJ++ltibGICG0=";
                }
                .${system};
            };
            sourceRoot = ".";
            nativeBuildInputs = [ pkgs.installShellFiles ];
            installPhase = ''
              runHook preInstall
              install -Dm755 just "$out/bin/just"
              installManPage just.1
              installShellCompletion --cmd just completions/just.{bash,fish,zsh}
              runHook postInstall
            '';
          });

          pnpm = pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
            pname = "pnpm";
            version = pkgs.lib.removePrefix "pnpm@" webPackage.packageManager;
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@pnpm/exe.linux-${npmArch}-musl/-/exe.linux-${npmArch}-musl-${finalAttrs.version}.tgz";
              hash =
                {
                  x86_64-linux = "sha512-MnC5vpIXYubhDZCgCwlfJMg7Cg6HupN2IuouT9gD/tUmOfVdQYqeyYccWbthyo/Jeto8de1oQlxeRN1+1Hl2DQ==";
                  aarch64-linux = "sha512-Ceit9zn4g5ZqCJtx1fV8eJE7p8aeXMrGZ+Dc01vRqZLIUNgNeI+Ur0ruyqxtsnJx6rGADyXzohumxPLHjaJ5AQ==";
                }
                .${system};
            };
            nativeBuildInputs = [ pkgs.makeWrapper ];
            installPhase = ''
              runHook preInstall
              install -Dm755 pnpm "$out/bin/pnpm"
              makeWrapper "$out/bin/pnpm" "$out/bin/pnpx" --add-flags dlx
              ln -s pnpm "$out/bin/pn"
              ln -s pnpx "$out/bin/pnx"
              runHook postInstall
            '';
          });

          tsrs = pkgs.stdenvNoCC.mkDerivation (finalAttrs: {
            pname = "tsrs";
            version = webPackage.devDependencies.tsrs;
            src = pkgs.fetchurl {
              url = "https://registry.npmjs.org/@tsrs/linux-${npmArch}-musl/-/linux-${npmArch}-musl-${finalAttrs.version}.tgz";
              hash =
                {
                  x86_64-linux = "sha512-zm89HYpXAv36XuXrEsfxAEmGTehY5K0L27+tFmJzxX2CqLwki0AX4FGA78Fy97x8Yk8kOR8FJO2xTvSW9vXBIg==";
                  aarch64-linux = "sha512-ZTZxIv/W4qiqDBCXcDlr8ma76JCO0DQHbUukuhpSpKHz3E2m5FCwLcra/NTqAVniyLU6/RjIOCIcDRpVQvq6cQ==";
                }
                .${system};
            };
            installPhase = ''
              runHook preInstall
              mkdir -p "$out/libexec/tsrs"
              install -m755 tsrs "$out/libexec/tsrs"
              install -m644 lib*.d.ts "$out/libexec/tsrs"
              runHook postInstall
            '';
          });

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
            TSRS_BINARY = "${tsrs}/libexec/tsrs/tsrs";
            packages = with pkgs; [
              actionlint
              dprint
              just
              inputs.just-lsp.packages.${system}.default
              nodejs_24
              pnpm
              prek
              sea-orm-cli
              taplo
              typescript
              ty
              uv
              python
              ruff
              playwright-driver.browsers
              rust-analyzer-unwrapped
              rustup
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

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
  };

  outputs =
    {
      self,
      fenix,
      nixpkgs,
      flake-utils,
    }:
    (flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [
            fenix.overlays.default
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
        };
      }
    ));
}

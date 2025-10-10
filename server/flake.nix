{
  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix/monthly";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    flake-utils = {
      url = "github:numtide/flake-utils";
    };
  };

  outputs =
    {
      self,
      flake-utils,
      fenix,
      nixpkgs,
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

        rusty-hook = pkgs.rustPlatform.buildRustPackage {
          pname = "rusty-hook";
          version = "0.11.2";
          cargoHash = "sha256-HC+1Cs2BeIPHuuGxcFEB8GqcyrrUEYcSM+KgE/INxIw=";
          src = pkgs.fetchFromGitHub {
            owner = "swellaby";
            repo = "rusty-hook";
            rev = "3016242";
            hash = "sha256-enqEsI0TSazVpIP9Awt/ZWjbxE6j1zzccggLF4SF358=";
          };
        };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [
            (pkgs.fenix.complete.withComponents [
              "cargo"
              "clippy"
              "rust-analyzer"
              "rust-src"
              "rustc-codegen-cranelift-preview"
              "rustfmt"
            ])
            clang
            mold
            openssl
            pkg-config
          ];
          packages = with pkgs; [
            rusty-hook
            dprint
            just
          ];
        };
      }
    ));
}

{
  description = "TouhouCloudMusic/web dev env & helpers";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils = {
      url = "github:numtide/flake-utils";
    };
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    (flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        tsgo = pkgs.buildGoModule {
          src = pkgs.fetchFromGitHub {
            owner = "microsoft";
            repo = "typescript-go";
            rev = "2ad9453";
            fetchSubmodules = true;
          };
        };
      in
      {
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            pnpm
            just
            oxlint
            # tsc
          ];
        };
      }
    ));
}

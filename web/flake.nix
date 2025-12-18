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
      in
      {
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            just-lsp
            nodejs_22
            typescript-go
            pnpm
            just
            oxlint
            # tsc
          ];
        };
      }
    ));
}

{
  description = "ditl — декларации ITL 002 / ITL 004 в браузере";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          # typst — чтобы править шаблоны и собирать скачанные .typ локально.
          packages = [ pkgs.nodejs_24 pkgs.typst ];
        };
      });
    };
}

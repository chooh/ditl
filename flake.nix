{
  description = "ditl — декларации ITL 002 / ITL 004 в браузере";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_24 pkgs.git pkgs.typst pkgs.liberation_ttf ];

          # Те же Liberation Sans/Serif, что бандлит веб-версия (src/assets/fonts),
          # иначе typst CLI на macOS их не находит и молча откатывается на Times New Roman.
          TYPST_FONT_PATHS = "${pkgs.liberation_ttf}/share/fonts/truetype";
        };
      });
    };
}

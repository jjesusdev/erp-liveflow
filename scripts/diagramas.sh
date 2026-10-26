#!/usr/bin/env bash
# Renderiza los diagramas D2 de docs/diagramas/ a SVG (versionado en git).
#
#   npm run diagramas        → render único (lo que corre CI)
#   npm run diagramas:watch  → re-render al guardar
#
# El .d2 es la fuente de verdad. Nunca editar el .svg a mano.
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dir="$raiz/docs/diagramas"
watch="${1:-}"

if ! command -v d2 >/dev/null 2>&1; then
  cat >&2 <<'MSG'
✗ d2 no está instalado.

  curl -fsSL https://d2lang.com/install.sh | sh -s -- --prefix "$HOME/.local"
  export PATH="$HOME/.local/bin:$PATH"

Si el instalador falla en "make: not found", el binario ya está descargado
en ~/.local/lib/d2/d2-*/bin/d2: enlazalo con
  ln -sf ~/.local/lib/d2/d2-*/bin/d2 ~/.local/bin/d2
MSG
  exit 1
fi

shopt -s nullglob
archivos=("$dir"/*.d2)

if [ ${#archivos[@]} -eq 0 ]; then
  echo "No hay archivos .d2 en docs/diagramas/"
  exit 0
fi

for archivo in "${archivos[@]}"; do
  salida="${archivo%.d2}.svg"
  if [ "$watch" = "--watch" ]; then
    d2 --watch "$archivo" "$salida" &
  else
    d2 "$archivo" "$salida"
  fi
done

if [ "$watch" = "--watch" ]; then
  echo "Observando ${#archivos[@]} diagrama(s). Ctrl+C para salir."
  wait
fi

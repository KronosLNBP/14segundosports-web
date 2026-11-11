# 14segundosports-web

Sitio de **14 Segundos Sports** (14segundosports.com.mx): noticias, juegos, calendario, videos, estadísticas, posiciones, ligas, jugadores, picks y A Fondo.

- Sin dependencias: `node scripts/build.mjs` genera `dist/`, `node scripts/serve.mjs` lo sirve en local.
- Contenido en `content/` (Markdown) y `data/` (JSON).
- Hosting: GitHub Pages vía GitHub Actions (`.github/workflows/pages.yml`). Settings → Pages → Source: GitHub Actions.
- Publicación: Pull Request → vista previa → merge a `main` → en línea.

Guía completa de estructura, formato de notas y reglas editoriales: [CLAUDE.md](CLAUDE.md).

> El contenido actual es **de ejemplo** (marcado con `ejemplo: true`). Se reemplaza con la migración del WordPress y datos reales antes de apuntar el dominio.

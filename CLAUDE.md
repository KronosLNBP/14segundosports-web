# 14 Segundos Sports — instrucciones para Claude

Sitio de noticias deportivas (estructura inspirada en NBA.com) para 14segundosports.com.mx.
Generador estático propio, **sin dependencias**: solo Node 18+. No agregues paquetes npm sin que lo pidan.

## Comandos
- `node scripts/build.mjs` → genera `dist/`. Si falla, no se publica: corrige el error que imprime.
- `node scripts/serve.mjs` → revisa en http://localhost:4321

## Dónde está cada cosa
| Qué | Archivo |
|---|---|
| Notas | `content/noticias/AAAA-MM-DD-slug.md` |
| Páginas (Nosotros, Servicios, CEO…) | `content/paginas/slug.md` |
| Menú, pie, redes | `site.config.json` |
| Ligas (nombre, color, si permite picks) | `data/ligas.json` |
| Marcadores y calendario | `data/juegos.json` |
| Tablas de posiciones | `data/posiciones.json` |
| Líderes estadísticos | `data/lideres.json` |
| Picks | `data/picks.json` |
| Videos (highlights, A Fondo, retro) | `data/videos.json` |
| Plantillas HTML | `scripts/build.mjs` |
| Estilos y marca | `public/assets/styles.css` (variables en `:root`) |

## Formato de una nota
```markdown
---
titulo: Astros de Jalisco toman ventaja de 2-0 sobre Mineros
fecha: 2026-11-11
liga: lnbp            # id de data/ligas.json, o null
resumen: Una o dos líneas para portada y redes.
autor: Redacción 14 Segundos
categoria: Movimientos   # opcional (p. ej. "Negocio del deporte")
destacado: true          # opcional: entra al carrusel principal
imagen: /img/2026/astros.jpg   # opcional, imágenes en public/img/
borrador: true           # opcional: no se publica
---
Texto en Markdown. Embeds en su propia línea: {{youtube ID}}  {{tiktok URL}}
```

## Workflow de publicación
1. Cada cambio de contenido va en una **rama nueva** (`nota/slug`, `datos/fecha`, `picks/fecha`) y un **Pull Request**.
2. Corre el build antes de subir. El PR genera vista previa (Vercel); una persona la revisa.
3. Al hacer merge a `main`, se publica solo en el sitio.
4. Cambios de diseño o código: también por PR, con capturas de escritorio y móvil.

## Reglas editoriales (obligatorias)
- **Picks:** solo en ligas con `"picks": true` en `data/ligas.json` (NBA, G League). **Nunca LNBP**: Fer Vargas es directivo de la liga. El build falla si se intenta.
- Los picks **nunca se publican sin aprobación humana**. Registrar todos los resultados (ganados y perdidos); no editar resultados pasados.
- Nada de "pick seguro", "ganancia garantizada" ni lenguaje que incite a apostar. Enlaces o patrocinios solo de casas con permiso de la SEGOB, marcados como patrocinados.
- No copiar notas de otros medios: redactar con palabras propias y citar la fuente. No inventar declaraciones, cifras ni resultados.
- Contenido con `ejemplo: true` o `"ejemplo": true` es provisional y debe reemplazarse antes del lanzamiento.

## Automatizaciones previstas
- `dist/feed.xml` y `dist/api/noticias.json`: los consumen `fb-autopost` y `tiktok-autopilot` para publicar en redes.
- La app de anotación de la Liga 14 Segundos escribirá en `data/juegos.json`, `posiciones.json` y `lideres.json`.
- Tarea programada diaria: redacta borradores (`borrador: true`) en un PR para revisión.

// Generador del sitio 14 Segundos Sports. Sin dependencias: solo Node 18+.
// Uso: node scripts/build.mjs   → genera ./dist
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { markdown, parseFrontmatter, escapeHtml as e } from './lib/markdown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Prefijo de ruta: vacío con dominio propio; "/nombre-repo" si se sirve en usuario.github.io/nombre-repo
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const conBase = (html) => (BASE ? html.replace(/(href|src|action)="\/(?!\/)/g, `$1="${BASE}/`) : html);
const DIST = path.join(ROOT, 'dist');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

// ---------- Datos ----------
const site = readJSON('site.config.json');
const ligas = readJSON('data/ligas.json');
const ligaById = Object.fromEntries(ligas.map((l) => [l.id, l]));
const juegosData = readJSON('data/juegos.json');
const posicionesData = readJSON('data/posiciones.json');
const lideresData = readJSON('data/lideres.json');
const picksData = readJSON('data/picks.json');
const videosData = readJSON('data/videos.json');

const errores = [];
const avisos = [];

function leerCarpeta(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs).filter((f) => f.endsWith('.md')).map((f) => {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(abs, f), 'utf8'));
    return { ...data, slug: f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''), archivo: `${dir}/${f}`, html: markdown(body) };
  });
}

const hoyISO = new Date().toISOString().slice(0, 10);
const noticias = leerCarpeta('content/noticias')
  .filter((n) => {
    if (n.borrador) { avisos.push(`Borrador (no se publica): ${n.archivo}`); return false; }
    return true;
  })
  .map((n) => ({ ...n, fecha: String(n.fecha || '').slice(0, 10) }))
  .sort((a, b) => b.fecha.localeCompare(a.fecha) || a.archivo.localeCompare(b.archivo));
const paginas = leerCarpeta('content/paginas');

// Validaciones
for (const n of noticias) {
  if (!n.titulo) errores.push(`Falta "titulo" en ${n.archivo}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.fecha)) errores.push(`Fecha inválida en ${n.archivo} (usa AAAA-MM-DD)`);
  if (n.liga && !ligaById[n.liga]) errores.push(`Liga desconocida "${n.liga}" en ${n.archivo}`);
}
const slugs = new Set();
for (const n of noticias) {
  if (slugs.has(n.slug)) errores.push(`Slug repetido: ${n.slug}`);
  slugs.add(n.slug);
}
for (const p of picksData.picks) {
  const l = ligaById[p.liga];
  if (!l) errores.push(`Pick con liga desconocida: ${p.id}`);
  else if (!l.picks) errores.push(`Pick NO permitido en ${l.nombre} (${p.id}). Las reglas prohíben picks en esta liga.`);
  if (!['pendiente', 'ganado', 'perdido', 'push'].includes(p.resultado)) errores.push(`Resultado inválido en pick ${p.id}`);
}
for (const [nombre, d] of Object.entries({ juegos: juegosData, posiciones: posicionesData, lideres: lideresData, picks: picksData, videos: videosData })) {
  if (d.ejemplo) avisos.push(`data/${nombre}.json todavía tiene DATOS DE EJEMPLO`);
}
const notasEjemplo = noticias.filter((n) => n.ejemplo).length;
if (notasEjemplo) avisos.push(`${notasEjemplo} notas marcadas como ejemplo`);

if (errores.length) {
  console.error('\n✖ El sitio no se construyó por estos errores:\n' + errores.map((x) => '  - ' + x).join('\n'));
  process.exit(1);
}

// ---------- Utilidades ----------
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function fechaCorta(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]} ${y}`;
}
function fechaLarga(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dia} ${d} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][m - 1]}`;
}
const urlNota = (n) => `/noticias/${n.slug}/`;
const badge = (ligaId, enlace = true) => {
  const l = ligaById[ligaId];
  if (!l) return '';
  return enlace
    ? `<a class="badge" style="--c:${l.color}" href="/ligas/${l.id}/">${e(l.nombre)}</a>`
    : `<span class="badge" style="--c:${l.color}">${e(l.nombre)}</span>`;
};
const groupBy = (arr, fn) => arr.reduce((acc, x) => ((acc[fn(x)] ||= []).push(x), acc), {});

function escribir(ruta, html) {
  const file = path.join(DIST, ruta.replace(/^\//, ''), ruta.endsWith('/') ? 'index.html' : '');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, conBase(html));
}

// ---------- Componentes ----------
function marcador(j, compacto = false) {
  const l = ligaById[j.liga];
  const fin = j.estado === 'final';
  const vivo = j.estado === 'en-vivo';
  const estado = vivo ? `<span class="vivo">● EN VIVO</span> ${e(j.periodo || '')}` : fin ? 'Final' : `${e(j.hora || '')} h`;
  const ganaL = fin && j.local.puntos > j.visita.puntos;
  const ganaV = fin && j.visita.puntos > j.local.puntos;
  const fila = (t, gana) => `<div class="eq${gana ? ' gana' : ''}"><span class="ab">${e(t.abrev)}</span><span class="nm">${e(t.nombre)}</span><span class="pts">${t.puntos ?? ''}</span></div>`;
  return `<article class="score${compacto ? ' compacto' : ''}" data-liga="${e(j.liga)}">
    <header><span class="lg" style="--c:${l?.color}">${e(l?.nombre || '')}</span><span class="st">${estado}</span></header>
    ${fila(j.visita, ganaV)}${fila(j.local, ganaL)}
    ${!compacto && (j.fase || j.serie) ? `<footer>${e([j.fase, j.serie].filter(Boolean).join(' · '))}</footer>` : ''}
  </article>`;
}

function tarjetaNota(n, grande = false) {
  const l = ligaById[n.liga];
  const img = n.imagen
    ? `<img src="${e(n.imagen)}" alt="" loading="lazy">`
    : `<div class="ph" style="--c:${l?.color || '#ff6b00'}"><span>${e(l?.nombre || n.categoria || '14S')}</span></div>`;
  return `<article class="card${grande ? ' grande' : ''}">
    <a class="media" href="${urlNota(n)}">${img}</a>
    <div class="txt">
      <div class="meta">${badge(n.liga)}${n.categoria ? `<span class="cat">${e(n.categoria)}</span>` : ''}<time>${fechaCorta(n.fecha)}</time>${n.ejemplo ? '<span class="ej">Ejemplo</span>' : ''}</div>
      <h3><a href="${urlNota(n)}">${e(n.titulo)}</a></h3>
      ${n.resumen ? `<p>${e(n.resumen)}</p>` : ''}
    </div>
  </article>`;
}

function tarjetaVideo(v) {
  const l = ligaById[v.liga];
  const tipos = { highlight: 'Highlight', resumen: 'Resumen', 'en-vivo': 'En vivo', 'a-fondo': 'A Fondo', retro: 'Retro 14s' };
  const href = v.youtube ? `https://www.youtube.com/watch?v=${e(v.youtube)}` : v.tiktok || '#';
  const thumb = v.youtube
    ? `<img src="https://i.ytimg.com/vi/${e(v.youtube)}/hqdefault.jpg" alt="" loading="lazy">`
    : `<div class="ph" style="--c:${l?.color || '#ff6b00'}"></div>`;
  return `<article class="video" data-tipo="${e(v.tipo)}">
    <a href="${href}" ${href !== '#' ? 'target="_blank" rel="noopener"' : ''}>
      <div class="vmedia">${thumb}<span class="play" aria-hidden="true">▶</span><span class="dur">${e(tipos[v.tipo] || v.tipo)}</span></div>
      <h3>${e(v.titulo)}</h3>
    </a>
    <div class="meta">${badge(v.liga)}<time>${fechaCorta(v.fecha)}</time></div>
  </article>`;
}

function tablaPosiciones(t, max = Infinity) {
  return t.grupos.map((g) => {
    const filas = [...g.equipos]
      .map((x) => ({ ...x, pct: x.g + x.p ? x.g / (x.g + x.p) : 0 }))
      .sort((a, b) => b.pct - a.pct);
    const lider = filas[0];
    return `<div class="tabla">
      ${t.grupos.length > 1 || g.nombre !== 'General' ? `<h4>${e(g.nombre)}</h4>` : ''}
      <table><thead><tr><th>#</th><th class="izq">Equipo</th><th>G</th><th>P</th><th>%</th><th>JD</th></tr></thead><tbody>
      ${filas.slice(0, max).map((x, i) => `<tr><td>${i + 1}</td><td class="izq">${e(x.equipo)}</td><td>${x.g}</td><td>${x.p}</td><td>${x.pct.toFixed(3).replace(/^0/, '')}</td><td>${i === 0 ? '—' : (((lider.g - x.g) + (x.p - lider.p)) / 2).toFixed(1)}</td></tr>`).join('')}
      </tbody></table></div>`;
  }).join('');
}

function bloqueLideres(c) {
  return `<div class="lider-cat">
    <h4>${e(c.categoria)} <small>${e(c.abrev)}</small></h4>
    <ol>${c.jugadores.map((j) => `<li><span class="nm">${e(j.nombre)}<small>${e(j.equipo)}</small></span><b>${j.valor}</b></li>`).join('')}</ol>
  </div>`;
}

function recordPicks() {
  const r = { ganado: 0, perdido: 0, push: 0, unidades: 0 };
  for (const p of picksData.picks) {
    if (p.resultado === 'ganado') {
      r.ganado++;
      const m = Number(p.momio);
      r.unidades += (p.unidades || 1) * (m > 0 ? m / 100 : 100 / Math.abs(m));
    } else if (p.resultado === 'perdido') { r.perdido++; r.unidades -= p.unidades || 1; }
    else if (p.resultado === 'push') r.push++;
  }
  const tot = r.ganado + r.perdido;
  r.pct = tot ? Math.round((r.ganado / tot) * 100) : 0;
  return r;
}

const chipsLigas = (ids, todas = 'Todas') => `<div class="chips" role="tablist">
  <button class="chip on" data-filtro="*">${todas}</button>
  ${ids.map((id) => `<button class="chip" data-filtro="${e(id)}">${e(ligaById[id]?.nombre || id)}</button>`).join('')}
</div>`;

// ---------- Layout ----------
function layout({ titulo, descripcion, contenido, ruta = '/', clase = '' }) {
  const t = titulo ? `${titulo} | ${site.nombre}` : `${site.nombre} · ${site.lema}`;
  const ticker = juegosData.juegos
    .filter((j) => j.fecha >= '0000')
    .sort((a, b) => (a.estado === 'en-vivo' ? -1 : b.estado === 'en-vivo' ? 1 : a.fecha.localeCompare(b.fecha)))
    .slice(0, 12)
    .map((j) => marcador(j, true)).join('');
  const activo = (u) => (ruta.startsWith(u) ? ' class="on"' : '');
  return `<!doctype html>
<html lang="es-MX">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(t)}</title>
<meta name="description" content="${e(descripcion || site.descripcion)}">
<link rel="canonical" href="${site.url}${ruta}">
<meta property="og:title" content="${e(titulo || site.nombre)}">
<meta property="og:description" content="${e(descripcion || site.descripcion)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${site.url}${ruta}">
<meta name="theme-color" content="#0b1220">
<link rel="alternate" type="application/rss+xml" title="${e(site.nombre)}" href="/feed.xml">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="${clase}">
<a class="skip" href="#contenido">Saltar al contenido</a>
<div class="ticker" aria-label="Marcadores">
  <a class="ticker-tit" href="/juegos/">Juegos</a>
  <div class="ticker-row">${ticker}</div>
</div>
<header class="top">
  <div class="wrap top-in">
    <a class="logo" href="/" aria-label="${e(site.nombre)}, inicio"><span class="reloj">14</span><span class="lt">SEGUNDOS<small>SPORTS</small></span></a>
    <button class="burger" aria-label="Menú" aria-expanded="false" aria-controls="menu">☰</button>
    <nav id="menu" class="menu">${site.menu.map((m) => `<a href="${m.url}"${activo(m.url)}>${e(m.titulo)}</a>`).join('')}</nav>
  </div>
</header>
<main id="contenido">
${contenido}
</main>
<footer class="pie">
  <div class="wrap">
    <div class="pie-top">
      <a class="logo" href="/"><span class="reloj">14</span><span class="lt">SEGUNDOS<small>SPORTS</small></span></a>
      <div class="redes">${site.redes.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">${e(r.red)}</a>`).join('')}</div>
    </div>
    <div class="pie-cols">
      ${site.pie.map((c) => `<div><h4>${e(c.titulo)}</h4>${c.enlaces.map((l) => `<a href="${l.url}">${e(l.titulo)}</a>`).join('')}</div>`).join('')}
      <div><h4>Ligas</h4>${ligas.map((l) => `<a href="/ligas/${l.id}/">${e(l.nombre)}</a>`).join('')}</div>
    </div>
    <p class="legal"><strong>+18.</strong> Las apuestas son solo para mayores de edad. Juega con responsabilidad y solo en casas con permiso de la SEGOB. Los picks son opinión editorial, no garantizan resultados.</p>
    <p class="legal">© ${new Date().getFullYear()} ${e(site.nombre)}. ${e(site.lema)}.</p>
  </div>
</footer>
<script src="/assets/main.js" defer></script>
</body>
</html>`;
}

const seccion = (titulo, cuerpo, mas) => `<section class="sec">
  <div class="sec-h"><h2>${titulo}</h2>${mas ? `<a class="mas" href="${mas}">Ver todo →</a>` : ''}</div>
  ${cuerpo}
</section>`;
const cabecera = (titulo, sub) => `<div class="cab"><div class="wrap"><h1>${titulo}</h1>${sub ? `<p>${sub}</p>` : ''}</div></div>`;

// ---------- Páginas ----------
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

// Portada
{
  const destacadas = noticias.filter((n) => n.destacado).slice(0, 5);
  const principal = destacadas[0] || noticias[0];
  const relacionadas = destacadas.slice(1, 5);
  const titulares = noticias.filter((n) => n !== principal).slice(0, 8);
  const tendencias = videosData.videos.filter((v) => v.tipo === 'highlight').slice(0, 4);
  const resumenes = videosData.videos.filter((v) => v.tipo === 'resumen').slice(0, 4);
  const tablaLnbp = posicionesData.tablas.find((t) => t.liga === 'lnbp') || posicionesData.tablas[0];
  const lideresLnbp = lideresData.categorias.filter((c) => c.liga === 'lnbp').slice(0, 3);
  const picksHoy = picksData.picks.filter((p) => p.resultado === 'pendiente').slice(0, 3);
  const rec = recordPicks();
  const aFondo = videosData.videos.find((v) => v.tipo === 'a-fondo');
  const negocio = noticias.filter((n) => n.categoria === 'Negocio del deporte').slice(0, 1);

  const contenido = `
<div class="wrap">
  <section class="hero">
    <div class="hero-main">${principal ? tarjetaNota(principal, true) : ''}</div>
    <aside class="hero-side">
      <h2 class="mini-t">Más destacadas</h2>
      ${relacionadas.map((n) => `<a class="rel" href="${urlNota(n)}">${badge(n.liga, false)}<span>${e(n.titulo)}</span></a>`).join('')}
      <h2 class="mini-t">Titulares</h2>
      <ul class="titulares">${titulares.slice(0, 6).map((n) => `<li><a href="${urlNota(n)}">${e(n.titulo)}</a></li>`).join('')}</ul>
      <a class="mas" href="/noticias/">Todas las noticias →</a>
    </aside>
  </section>

  ${seccion('Tendencias', `<div class="grid4">${tendencias.map(tarjetaVideo).join('')}</div>`, '/ver/')}

  <div class="dos">
    <div>
      ${seccion('Últimas noticias', `<div class="lista">${titulares.slice(0, 6).map((n) => tarjetaNota(n)).join('')}</div>`, '/noticias/')}
    </div>
    <aside>
      ${seccion(`Posiciones ${e(ligaById[tablaLnbp.liga]?.nombre || '')}`, tablaPosiciones(tablaLnbp, 5), '/posiciones/')}
      ${seccion('Líderes', `<div class="lideres">${lideresLnbp.map(bloqueLideres).join('')}</div>`, '/estadisticas/')}
    </aside>
  </div>

  ${resumenes.length ? seccion('Resúmenes de partidos', `<div class="grid4">${resumenes.map(tarjetaVideo).join('')}</div>`, '/ver/') : ''}

  <div class="dos">
    <div>
      ${seccion('Picks de la jornada', `
        <div class="record"><div><b>${rec.ganado}-${rec.perdido}${rec.push ? '-' + rec.push : ''}</b><span>Récord</span></div><div><b>${rec.pct}%</b><span>Acierto</span></div><div><b>${rec.unidades >= 0 ? '+' : ''}${rec.unidades.toFixed(2)}</b><span>Unidades</span></div></div>
        <div class="picks">${picksHoy.map(pickCard).join('') || '<p>No hay picks para hoy.</p>'}</div>
        <p class="mayor18">+18 · Juega con responsabilidad</p>`, '/picks/')}
    </div>
    <div>
      ${seccion('A Fondo con Fer Vargas', aFondo ? tarjetaVideo(aFondo) : '', '/podcast/')}
      ${negocio.length ? seccion('Negocio del deporte', negocio.map((n) => tarjetaNota(n)).join(''), '/noticias/') : ''}
    </div>
  </div>

  <section class="sec siguenos">
    <h2>Síguenos</h2>
    <div class="redes grandes">${site.redes.map((r) => `<a href="${r.url}" target="_blank" rel="noopener">${e(r.red)}</a>`).join('')}</div>
  </section>
</div>`;
  escribir('/', layout({ contenido, ruta: '/', clase: 'home' }));
}

function pickCard(p) {
  const l = ligaById[p.liga];
  return `<article class="pick ${p.resultado}">
    <header><span class="lg" style="--c:${l?.color}">${e(l?.nombre || '')}</span><time>${fechaCorta(p.fecha)}</time><span class="res">${e(p.resultado)}</span></header>
    <h3>${e(p.partido)}</h3>
    <p class="linea"><b>${e(p.pick)}</b> <span>${e(p.momio)}</span> <span>${p.unidades || 1}u</span></p>
    ${p.analisis ? `<p class="an">${e(p.analisis)}</p>` : ''}
  </article>`;
}

// Juegos
{
  const porFecha = groupBy([...juegosData.juegos].sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || '')), (j) => j.fecha);
  const ligasConJuegos = [...new Set(juegosData.juegos.map((j) => j.liga))];
  const contenido = cabecera('Juegos', 'Marcadores y resultados de todas las ligas') + `<div class="wrap">
    ${chipsLigas(ligasConJuegos)}
    ${Object.entries(porFecha).map(([f, js]) => `<section class="sec filtrable"><div class="sec-h"><h2>${fechaLarga(f)}</h2></div><div class="scores">${js.map((j) => marcador(j)).join('')}</div></section>`).join('')}
  </div>`;
  escribir('/juegos/', layout({ titulo: 'Juegos', contenido, ruta: '/juegos/' }));
}

// Calendario
{
  const prox = juegosData.juegos.filter((j) => j.estado === 'programado').sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.hora || '').localeCompare(b.hora || ''));
  const porFecha = groupBy(prox, (j) => j.fecha);
  const contenido = cabecera('Calendario', 'Próximos partidos') + `<div class="wrap">
    ${chipsLigas([...new Set(prox.map((j) => j.liga))])}
    ${Object.entries(porFecha).map(([f, js]) => `<section class="sec filtrable"><div class="sec-h"><h2>${fechaLarga(f)}</h2></div>
      <table class="cal"><tbody>${js.map((j) => `<tr data-liga="${j.liga}"><td class="hr">${e(j.hora || '')}</td><td>${badge(j.liga)}</td><td class="izq"><b>${e(j.visita.nombre)}</b> @ <b>${e(j.local.nombre)}</b>${j.fase ? `<small>${e(j.fase)}</small>` : ''}</td></tr>`).join('')}</tbody></table>
    </section>`).join('') || '<p>Sin partidos programados.</p>'}
  </div>`;
  escribir('/calendario/', layout({ titulo: 'Calendario', contenido, ruta: '/calendario/' }));
}

// Ver
{
  const tipos = [['*', 'Todo'], ['highlight', 'Highlights'], ['resumen', 'Resúmenes'], ['en-vivo', 'En vivo'], ['a-fondo', 'A Fondo'], ['retro', 'Retro 14s']];
  const contenido = cabecera('Ver', 'Highlights, resúmenes, transmisiones y entrevistas') + `<div class="wrap">
    <div class="chips" data-attr="tipo">${tipos.map(([k, t], i) => `<button class="chip${i ? '' : ' on'}" data-filtro="${k}">${t}</button>`).join('')}</div>
    <div class="grid4 filtrable">${videosData.videos.map(tarjetaVideo).join('')}</div>
  </div>`;
  escribir('/ver/', layout({ titulo: 'Ver', contenido, ruta: '/ver/' }));
}

// Noticias (índice + notas)
{
  const ligasConNotas = [...new Set(noticias.map((n) => n.liga).filter(Boolean))];
  const contenido = cabecera('Noticias', 'Lo último del deporte mexicano e internacional') + `<div class="wrap">
    ${chipsLigas(ligasConNotas)}
    <div class="grid3 filtrable">${noticias.map((n) => tarjetaNota(n).replace('<article class="card"', `<article class="card" data-liga="${e(n.liga || '')}"`)).join('')}</div>
  </div>`;
  escribir('/noticias/', layout({ titulo: 'Noticias', contenido, ruta: '/noticias/' }));

  for (const n of noticias) {
    const relacionadas = noticias.filter((x) => x !== n && x.liga === n.liga).slice(0, 3);
    const l = ligaById[n.liga];
    const contenido = `<article class="nota wrap">
      <header>
        <div class="meta">${badge(n.liga)}${n.categoria ? `<span class="cat">${e(n.categoria)}</span>` : ''}${n.ejemplo ? '<span class="ej">Ejemplo</span>' : ''}</div>
        <h1>${e(n.titulo)}</h1>
        ${n.resumen ? `<p class="bajada">${e(n.resumen)}</p>` : ''}
        <p class="firma">${e(n.autor || 'Redacción 14 Segundos')} · <time datetime="${n.fecha}">${fechaLarga(n.fecha)}</time></p>
      </header>
      ${n.imagen ? `<figure class="portada"><img src="${e(n.imagen)}" alt="${e(n.pie_imagen || '')}">${n.pie_imagen ? `<figcaption>${e(n.pie_imagen)}</figcaption>` : ''}</figure>` : `<div class="ph portada" style="--c:${l?.color || '#ff6b00'}"><span>${e(l?.nombre || n.categoria || '14 Segundos')}</span></div>`}
      <div class="cuerpo">${n.html}</div>
      <div class="compartir">Compartir:
        <a target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(n.titulo + ' ' + site.url + urlNota(n))}">WhatsApp</a>
        <a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(site.url + urlNota(n))}">Facebook</a>
        <a target="_blank" rel="noopener" href="https://x.com/intent/post?text=${encodeURIComponent(n.titulo)}&url=${encodeURIComponent(site.url + urlNota(n))}">X</a>
      </div>
    </article>
    ${relacionadas.length ? `<div class="wrap">${seccion('Relacionadas', `<div class="grid3">${relacionadas.map((x) => tarjetaNota(x)).join('')}</div>`)}</div>` : ''}`;
    escribir(urlNota(n), layout({ titulo: n.titulo, descripcion: n.resumen, contenido, ruta: urlNota(n) }));
  }
}

// Estadísticas
{
  const porLiga = groupBy(lideresData.categorias, (c) => c.liga);
  const contenido = cabecera('Estadísticas', 'Líderes, rachas y comparativas: quién está caliente') + `<div class="wrap">
    ${Object.entries(porLiga).map(([lg, cs]) => seccion(`Líderes ${e(ligaById[lg]?.nombre || lg)}`, `<div class="lideres">${cs.map(bloqueLideres).join('')}</div>`, `/ligas/${lg}/`)).join('')}
  </div>`;
  escribir('/estadisticas/', layout({ titulo: 'Estadísticas', contenido, ruta: '/estadisticas/' }));
}

// Posiciones
{
  const contenido = cabecera('Posiciones', 'Tablas de cada liga') + `<div class="wrap">
    ${posicionesData.tablas.map((t) => seccion(`${e(ligaById[t.liga]?.nombre || t.liga)} <small>${e(t.temporada || '')}</small>`, `<div class="tablas">${tablaPosiciones(t)}</div>`, `/ligas/${t.liga}/`)).join('')}
  </div>`;
  escribir('/posiciones/', layout({ titulo: 'Posiciones', contenido, ruta: '/posiciones/' }));
}

// Ligas (índice + cada liga)
{
  const porDeporte = groupBy(ligas, (l) => l.deporte);
  const contenido = cabecera('Ligas', 'Todas las competencias que cubrimos') + `<div class="wrap">
    ${Object.entries(porDeporte).map(([d, ls]) => seccion(e(d), `<div class="ligas">${ls.map((l) => `<a class="liga" href="/ligas/${l.id}/" style="--c:${l.color}"><b>${e(l.nombre)}</b><span>${e(l.nombreLargo)}</span></a>`).join('')}</div>`)).join('')}
  </div>`;
  escribir('/ligas/', layout({ titulo: 'Ligas', contenido, ruta: '/ligas/' }));

  for (const l of ligas) {
    const ns = noticias.filter((n) => n.liga === l.id);
    const js = juegosData.juegos.filter((j) => j.liga === l.id);
    const tabla = posicionesData.tablas.find((t) => t.liga === l.id);
    const lid = lideresData.categorias.filter((c) => c.liga === l.id);
    const vs = videosData.videos.filter((v) => v.liga === l.id);
    const vacio = !ns.length && !js.length && !tabla && !lid.length && !vs.length;
    const contenido = `<div class="cab liga-cab" style="--c:${l.color}"><div class="wrap"><p class="dep">${e(l.deporte)}</p><h1>${e(l.nombre)}</h1><p>${e(l.nombreLargo)}</p></div></div>
    <div class="wrap">
      ${js.length ? seccion('Juegos', `<div class="scores">${js.map((j) => marcador(j)).join('')}</div>`, '/juegos/') : ''}
      <div class="dos">
        <div>${ns.length ? seccion('Noticias', `<div class="lista">${ns.slice(0, 8).map((n) => tarjetaNota(n)).join('')}</div>`) : ''}
             ${vs.length ? seccion('Videos', `<div class="grid2">${vs.map(tarjetaVideo).join('')}</div>`, '/ver/') : ''}</div>
        <aside>${tabla ? seccion('Posiciones', tablaPosiciones(tabla)) : ''}
               ${lid.length ? seccion('Líderes', `<div class="lideres">${lid.map(bloqueLideres).join('')}</div>`) : ''}</aside>
      </div>
      ${vacio ? '<p class="vacio">Muy pronto: noticias, resultados y estadísticas de esta liga.</p>' : ''}
      ${!l.picks ? '' : `<p class="nota-picks">Consulta los <a href="/picks/">picks de ${e(l.nombre)}</a>.</p>`}
    </div>`;
    escribir(`/ligas/${l.id}/`, layout({ titulo: l.nombreLargo, contenido, ruta: `/ligas/${l.id}/` }));
  }
}

// Jugadores
{
  const jugadores = new Map();
  for (const c of lideresData.categorias) for (const j of c.jugadores) {
    const k = j.nombre + '|' + c.liga;
    if (!jugadores.has(k)) jugadores.set(k, { ...j, liga: c.liga, stats: [] });
    jugadores.get(k).stats.push(`${j.valor} ${c.abrev}`);
  }
  const contenido = cabecera('Jugadores', 'Fichas y números de los protagonistas') + `<div class="wrap">
    <div class="buscador"><input type="search" placeholder="Buscar jugador o equipo…" aria-label="Buscar jugador" data-buscar=".jug"></div>
    <div class="jugadores">${[...jugadores.values()].map((j) => `<div class="jug"><div class="av">${e(j.nombre.split(' ').map((x) => x[0]).join('').slice(0, 2))}</div><div><b>${e(j.nombre)}</b><span>${e(j.equipo)} · ${e(ligaById[j.liga]?.nombre || '')}</span><small>${e(j.stats.join(' · '))}</small></div></div>`).join('')}</div>
    <p class="vacio">Las fichas completas se generarán con los datos de la app de anotación y de las ligas.</p>
  </div>`;
  escribir('/jugadores/', layout({ titulo: 'Jugadores', contenido, ruta: '/jugadores/' }));
}

// Picks
{
  const rec = recordPicks();
  const pend = picksData.picks.filter((p) => p.resultado === 'pendiente');
  const hist = picksData.picks.filter((p) => p.resultado !== 'pendiente');
  const permitidas = ligas.filter((l) => l.picks).map((l) => l.nombre).join(', ');
  const contenido = cabecera('Picks', 'Análisis y pronósticos con registro público de resultados') + `<div class="wrap">
    <div class="aviso18"><b>+18</b> Contenido solo para mayores de edad. Los picks son opinión editorial y no garantizan resultados. Apuesta con responsabilidad y solo en casas con permiso de la SEGOB.</div>
    <div class="record grande"><div><b>${rec.ganado}-${rec.perdido}${rec.push ? '-' + rec.push : ''}</b><span>Récord</span></div><div><b>${rec.pct}%</b><span>Acierto</span></div><div><b>${rec.unidades >= 0 ? '+' : ''}${rec.unidades.toFixed(2)}</b><span>Unidades</span></div></div>
    ${seccion('Picks de hoy', `<div class="picks">${pend.map(pickCard).join('') || '<p>No hay picks pendientes.</p>'}</div>`)}
    ${seccion('Historial', `<table class="hist"><thead><tr><th>Fecha</th><th>Liga</th><th class="izq">Partido</th><th class="izq">Pick</th><th>Momio</th><th>Resultado</th></tr></thead><tbody>${hist.map((p) => `<tr class="${p.resultado}"><td>${fechaCorta(p.fecha)}</td><td>${e(ligaById[p.liga]?.nombre || '')}</td><td class="izq">${e(p.partido)}</td><td class="izq">${e(p.pick)}</td><td>${e(p.momio)}</td><td class="res">${e(p.resultado)}</td></tr>`).join('')}</tbody></table>`)}
    <section class="sec" id="reglas"><div class="sec-h"><h2>Cómo trabajamos</h2></div>
      <ul class="reglas">
        <li>Publicamos picks solo de: <b>${e(permitidas)}</b>. No publicamos picks de ligas donde tenemos relación directa con la competencia.</li>
        <li>Registramos todos los resultados, ganados y perdidos. El récord no se edita.</li>
        <li>Cada pick lo revisa y aprueba una persona del equipo antes de publicarse.</li>
        <li>Nunca hablamos de "picks seguros" ni de ganancias garantizadas.</li>
        <li>Si algún contenido es patrocinado por una casa de apuestas, se indica claramente.</li>
      </ul>
    </section>
  </div>`;
  escribir('/picks/', layout({ titulo: 'Picks', descripcion: 'Picks de NBA y G League con registro público de resultados.', contenido, ruta: '/picks/' }));
}

// A Fondo / Podcast
{
  const vs = videosData.videos.filter((v) => v.tipo === 'a-fondo' || v.tipo === 'retro');
  const contenido = cabecera('A Fondo', 'Entrevistas y conversación con Fer Vargas') + `<div class="wrap">
    <div class="grid3">${vs.map(tarjetaVideo).join('')}</div>
  </div>`;
  escribir('/podcast/', layout({ titulo: 'A Fondo · Podcast', contenido, ruta: '/podcast/' }));
}

// Páginas institucionales
for (const p of paginas) {
  const contenido = cabecera(e(p.titulo), p.resumen ? e(p.resumen) : '') + `<div class="wrap"><div class="cuerpo pagina">${p.html}</div></div>`;
  escribir(`/${p.slug}/`, layout({ titulo: p.titulo, descripcion: p.resumen, contenido, ruta: `/${p.slug}/` }));
}

// 404
fs.writeFileSync(path.join(DIST, '404.html'), conBase(layout({ titulo: 'Página no encontrada', contenido: cabecera('Esta jugada no existe', 'La página que buscas no está. <a href="/">Volver al inicio</a>'), ruta: '/404' })));
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');

// Feed RSS + JSON (para automatizar redes: fb-autopost, tiktok-autopilot)
{
  const items = noticias.slice(0, 30);
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${e(site.nombre)}</title><link>${site.url}</link><description>${e(site.descripcion)}</description><language>es-MX</language>
${items.map((n) => `<item><title>${e(n.titulo)}</title><link>${site.url}${urlNota(n)}</link><guid>${site.url}${urlNota(n)}</guid><pubDate>${new Date(n.fecha + 'T12:00:00-06:00').toUTCString()}</pubDate><description>${e(n.resumen || '')}</description>${n.liga ? `<category>${e(ligaById[n.liga]?.nombre)}</category>` : ''}</item>`).join('\n')}
</channel></rss>`;
  fs.writeFileSync(path.join(DIST, 'feed.xml'), rss);
  fs.mkdirSync(path.join(DIST, 'api'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'api', 'noticias.json'), JSON.stringify(items.map((n) => ({
    titulo: n.titulo, url: site.url + urlNota(n), fecha: n.fecha, liga: n.liga, ligaNombre: ligaById[n.liga]?.nombre || null,
    resumen: n.resumen || '', imagen: n.imagen ? new URL(n.imagen, site.url).href : null, ejemplo: !!n.ejemplo,
  })), null, 2));
  fs.writeFileSync(path.join(DIST, 'api', 'juegos.json'), JSON.stringify(juegosData.juegos, null, 2));
}

// Sitemap y robots
{
  const rutas = ['/', '/juegos/', '/calendario/', '/ver/', '/noticias/', '/estadisticas/', '/posiciones/', '/ligas/', '/jugadores/', '/picks/', '/podcast/',
    ...ligas.map((l) => `/ligas/${l.id}/`), ...noticias.map(urlNota), ...paginas.map((p) => `/${p.slug}/`)];
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rutas.map((r) => `<url><loc>${site.url}${r}</loc></url>`).join('\n')}\n</urlset>`);
  fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
}

const total = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((n, d) => n + (d.isDirectory() ? total(path.join(dir, d.name)) : d.name.endsWith('.html') ? 1 : 0), 0);
console.log(`✔ Sitio generado en dist/ (${total(DIST)} páginas, ${noticias.length} notas)`);
if (avisos.length) console.log('Avisos:\n' + avisos.map((x) => '  · ' + x).join('\n'));

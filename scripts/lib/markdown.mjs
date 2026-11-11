// Markdown mínimo sin dependencias, suficiente para notas deportivas.
// Soporta: # títulos, párrafos, listas (- y 1.), > citas, ---, imágenes, enlaces,
// **negritas**, *itálicas*, `código` y embeds en una línea: {{youtube ID}} {{tiktok URL}}

export function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (/^".*"$|^'.*'$/.test(v)) v = v.slice(1, -1);
    else if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (v === 'null' || v === '') v = null;
    else if (/^-?\d+(\.\d+)?$/.test(v)) v = Number(v);
    else if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean);
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

function inline(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => {
    const ext = /^https?:\/\//.test(u) ? ' target="_blank" rel="noopener"' : '';
    return `<a href="${u}"${ext}>${t}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  return s;
}

function embed(line) {
  let m = line.match(/^\{\{\s*youtube\s+([\w-]+)\s*\}\}$/);
  if (m) {
    return `<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" title="Video" loading="lazy" allowfullscreen></iframe></div>`;
  }
  m = line.match(/^\{\{\s*tiktok\s+(\S+)\s*\}\}$/);
  if (m) {
    return `<p><a class="btn" href="${escapeHtml(m[1])}" target="_blank" rel="noopener">Ver en TikTok</a></p>`;
  }
  return null;
}

export function markdown(src) {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const out = [];
  let para = [];
  let list = null; // { tag, items }
  let quote = [];

  const flushPara = () => {
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
    para = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
    quote = [];
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const t = line.trim();
    if (!t) { flushAll(); continue; }
    const e = embed(t);
    if (e) { flushAll(); out.push(e); continue; }
    let m;
    if ((m = t.match(/^(#{1,4})\s+(.*)$/))) {
      flushAll();
      const lvl = Math.min(m[1].length + 1, 5); // # → h2 (el h1 es el título de la nota)
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) { flushAll(); out.push('<hr>'); continue; }
    if ((m = t.match(/^>\s?(.*)$/))) { flushPara(); flushList(); quote.push(m[1]); continue; }
    if ((m = t.match(/^[-*]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== 'ul') { flushList(); list = { tag: 'ul', items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    if ((m = t.match(/^\d+[.)]\s+(.*)$/))) {
      flushPara(); flushQuote();
      if (!list || list.tag !== 'ol') { flushList(); list = { tag: 'ol', items: [] }; }
      list.items.push(m[1]);
      continue;
    }
    flushList(); flushQuote();
    para.push(t);
  }
  flushAll();
  return out.join('\n');
}

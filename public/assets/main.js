// Menú móvil
const burger = document.querySelector('.burger');
const menu = document.getElementById('menu');
burger?.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  burger.setAttribute('aria-expanded', String(abierto));
});

// Filtros por liga o por tipo (chips)
document.querySelectorAll('.chips').forEach((grupo) => {
  const attr = grupo.dataset.attr || 'liga';
  grupo.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.chip');
    if (!btn) return;
    grupo.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c === btn));
    const f = btn.dataset.filtro;
    document.querySelectorAll(`main [data-${attr}]`).forEach((el) => {
      el.classList.toggle('oculto', f !== '*' && el.dataset[attr] !== f);
    });
    // Oculta secciones que quedaron vacías
    document.querySelectorAll('main section.filtrable').forEach((s) => {
      const items = s.querySelectorAll(`[data-${attr}]`);
      s.classList.toggle('oculto', items.length > 0 && [...items].every((i) => i.classList.contains('oculto')));
    });
  });
});

// Buscador simple
document.querySelectorAll('[data-buscar]').forEach((input) => {
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    document.querySelectorAll(input.dataset.buscar).forEach((el) => {
      const t = el.textContent.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      el.classList.toggle('oculto', !t.includes(q));
    });
  });
});

// Menú por deporte: clic abre/cierra (táctil y móvil); en escritorio también abre al pasar el mouse
const esMovil = () => window.matchMedia('(max-width: 1180px)').matches;
document.querySelectorAll('.mm').forEach((mm) => {
  const btn = mm.querySelector('.mm-btn');
  btn.addEventListener('click', (ev) => {
    const tactil = window.matchMedia('(hover: none)').matches;
    if (!esMovil() && !tactil) return; // en escritorio con mouse el enlace lleva a la portada del deporte
    if (!mm.classList.contains('abierto')) {
      ev.preventDefault();
      document.querySelectorAll('.mm.abierto').forEach((o) => { if (o !== mm) { o.classList.remove('abierto'); o.querySelector('.mm-btn').setAttribute('aria-expanded', 'false'); } });
      mm.classList.add('abierto');
      btn.setAttribute('aria-expanded', 'true');
    } else if (esMovil()) {
      ev.preventDefault();
      mm.classList.remove('abierto');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  mm.addEventListener('mouseenter', () => btn.setAttribute('aria-expanded', 'true'));
  mm.addEventListener('mouseleave', () => btn.setAttribute('aria-expanded', 'false'));
});
document.addEventListener('click', (ev) => {
  if (!ev.target.closest('.mm')) document.querySelectorAll('.mm.abierto').forEach((o) => o.classList.remove('abierto'));
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') document.querySelectorAll('.mm.abierto').forEach((o) => o.classList.remove('abierto'));
});

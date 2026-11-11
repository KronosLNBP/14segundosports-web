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

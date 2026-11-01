// Grafik setinin etkileşimi: fare, dokunma ve klavye ile değer kutusu. Grafik derlemede çizilir; bu betik yalnız
// ipucu ekler. Sayfada aynı anda tek ipucu açık kalır.
const NS = 'http://www.w3.org/2000/svg';
let acikKapat = null;

function kur(kart) {
  const veri = JSON.parse(kart.querySelector('[data-graf-punkter]')?.textContent || 'null');
  const svg = kart.querySelector('svg');
  const tips = kart.querySelector('.g-tips');
  const flate = kart.querySelector('.g-flate');
  if (!veri || !svg || !tips || !veri.punkter.length) return;
  const vb = svg.viewBox.baseVal;
  let i = veri.punkter.length - 1;
  let folg = null;
  let ring = null;
  let aktiv = null;
  const midt = svg.querySelector('[data-midt]');
  const midtStart = midt?.textContent;

  if (veri.modus === 'serie' && veri.ramme) {
    folg = document.createElementNS(NS, 'line');
    folg.setAttribute('class', 'g-folg');
    folg.setAttribute('y1', veri.ramme.topp);
    folg.setAttribute('y2', veri.ramme.bunn);
    ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('class', 'g-ring');
    ring.setAttribute('r', '5');
    folg.style.display = ring.style.display = 'none';
    svg.append(folg, ring);
  }
  const elementer = veri.modus === 'element' ? [...svg.querySelectorAll('[data-i]')] : [];

  function skjul() {
    tips.hidden = true;
    if (folg) folg.style.display = ring.style.display = 'none';
    aktiv?.classList.remove('g-pa');
    aktiv = null;
    if (midt) midt.textContent = midtStart;
    if (acikKapat === skjul) acikKapat = null;
  }

  function vis(j) {
    i = Math.max(0, Math.min(veri.punkter.length - 1, j));
    const p = veri.punkter[i];
    if (acikKapat && acikKapat !== skjul) acikKapat();
    acikKapat = skjul;
    const r = svg.getBoundingClientRect();
    const fr = flate.getBoundingClientRect();
    const sx = r.width / vb.width;
    tips.textContent = p.tekst;
    tips.hidden = false;
    const halv = tips.offsetWidth / 2;
    const px = Math.max(halv, Math.min(fr.width - halv, r.left - fr.left + p.x * sx));
    tips.style.left = `${px}px`;
    tips.style.top = `${r.top - fr.top + p.y * sx}px`;
    if (folg) {
      folg.setAttribute('x1', p.x);
      folg.setAttribute('x2', p.x);
      ring.setAttribute('cx', p.x);
      ring.setAttribute('cy', p.y);
      folg.style.display = ring.style.display = '';
    }
    if (elementer.length) {
      aktiv?.classList.remove('g-pa');
      aktiv = elementer.find((e) => Number(e.dataset.i) === i) ?? null;
      aktiv?.classList.add('g-pa');
    }
    if (midt && p.midt) midt.textContent = p.midt;
  }

  function naermest(e) {
    const r = svg.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * vb.width;
    let best = 0;
    for (let j = 1; j < veri.punkter.length; j++) if (Math.abs(veri.punkter[j].x - x) < Math.abs(veri.punkter[best].x - x)) best = j;
    return best;
  }

  if (veri.modus === 'serie') {
    svg.addEventListener('pointermove', (e) => vis(naermest(e)));
    svg.addEventListener('pointerdown', (e) => { e.stopPropagation(); vis(naermest(e)); });
  } else {
    for (const el of elementer) {
      el.addEventListener('pointerenter', () => vis(Number(el.dataset.i)));
      el.addEventListener('pointerdown', (e) => { e.stopPropagation(); vis(Number(el.dataset.i)); });
    }
  }
  svg.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') skjul(); });
  kart.addEventListener('keydown', (e) => {
    const fram = e.key === 'ArrowRight' || (veri.modus === 'element' && e.key === 'ArrowDown');
    const bak = e.key === 'ArrowLeft' || (veri.modus === 'element' && e.key === 'ArrowUp');
    if (fram || bak) { vis(i + (fram ? 1 : -1)); e.preventDefault(); }
    if (e.key === 'Escape') skjul();
  });
  // Yalnız klavye odağında: başlığa dokunmak ipucu açmasın.
  kart.addEventListener('focusin', (e) => { if (e.target === kart && kart.matches(':focus-visible')) vis(i); });
  kart.addEventListener('focusout', (e) => { if (!kart.contains(e.relatedTarget)) skjul(); });
}

for (const kart of document.querySelectorAll('[data-graf]')) kur(kart);
document.addEventListener('pointerdown', () => acikKapat?.());

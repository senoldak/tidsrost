// Leseverktøy på artikkelsiden: tekststørrelse, høy kontrast, lesemodus, utskrift, Lytt, Del-meny (Kopier lenke),
// fremdriftslinje og «Fortsett der du slapp». Ett pakket skript (CSP: ingen innebygde skript).
// All lagring går gjennom try/catch: i privat modus eller med blokkert lagring virker verktøyene videre, bare uten å huske.
import { fortsettFra, fremdrift, lagringsnokkel, skalaFra, velgStemme } from '../lib/lesing.mjs';
import { safeStorage } from '../lib/safe-storage.ts';

const rot = document.documentElement;

const hent = (nokkel: string): string | null => safeStorage.getItem(nokkel);
const lagre = (nokkel: string, verdi: string) => safeStorage.setItem(nokkel, verdi);
const fjern = (nokkel: string) => safeStorage.removeItem(nokkel);


// ——— Tekststørrelse ———
function settSkala(s: string, husk: boolean) {
  rot.dataset.skala = s;
  document.querySelectorAll<HTMLButtonElement>('.skala button[data-skala]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.skala === s)));
  if (husk) lagre('tekststorrelse', s);
}
settSkala(skalaFra(hent('tekststorrelse')), false);
document.querySelectorAll<HTMLButtonElement>('.skala button[data-skala]').forEach((b) => b.addEventListener('click', () => settSkala(skalaFra(b.dataset.skala), true)));

// ——— Høy kontrast ———
const kontrastKnapp = document.querySelector<HTMLButtonElement>('.kontrast-knapp');
function settKontrast(pa: boolean, husk: boolean) {
  rot.classList.toggle('kontrast', pa);
  kontrastKnapp?.setAttribute('aria-pressed', String(pa));
  if (husk) lagre('kontrast', pa ? '1' : '0');
}
settKontrast(hent('kontrast') === '1', false);
kontrastKnapp?.addEventListener('click', () => settKontrast(!rot.classList.contains('kontrast'), true));

// ——— Utskrift ———
document.querySelector('.skriv-ut')?.addEventListener('click', () => print());

// ——— Lesemodus (Esc avslutter) ———
const lesemodusKnapp = document.querySelector<HTMLButtonElement>('.lesemodus-knapp:not(.kontrast-knapp):not(.skriv-ut)');
function lesemodus(pa: boolean) {
  if (rot.classList.contains('lesemodus') === pa) return;
  rot.classList.toggle('lesemodus', pa);
  lesemodusKnapp?.setAttribute('aria-pressed', String(pa));
  if (pa) {
    document.querySelector('details.les')?.removeAttribute('open');
    scrollTo({ top: 0 });
  }
}
lesemodusKnapp?.addEventListener('click', () => lesemodus(true));
document.querySelector('.avslutt-lesemodus')?.addEventListener('click', () => lesemodus(false));

// ——— Menyer: bare én åpen om gangen, lukkes ved klikk utenfor og med Esc ———
const menyer = () => document.querySelectorAll<HTMLDetailsElement>('.na-verktoy details[open]');
document.querySelectorAll<HTMLDetailsElement>('.na-verktoy details').forEach((d) =>
  d.addEventListener('toggle', () => {
    if (!d.open) return;
    menyer().forEach((annen) => {
      if (annen !== d) annen.open = false;
    });
  }),
);
document.addEventListener('click', (e) => {
  menyer().forEach((d) => {
    if (!d.contains(e.target as Node)) d.open = false;
  });
});
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  menyer().forEach((d) => {
    d.open = false;
  });
  lesemodus(false);
});

// ——— Kopier lenke ———
const melding = document.querySelector('.na-kopiert');
document.querySelectorAll<HTMLButtonElement>('.del-meny .kopier').forEach((knapp) => {
  if (!navigator.clipboard?.writeText) return;
  knapp.hidden = false;
  const tekst = knapp.querySelector('span');
  const original = tekst?.textContent ?? 'Kopier lenke';
  knapp.addEventListener('click', async () => {
    let ok = true;
    try {
      await navigator.clipboard.writeText(knapp.dataset.url ?? location.href);
    } catch {
      ok = false;
    }
    const svar = ok ? 'Lenken er kopiert.' : 'Kunne ikke kopiere lenken.';
    if (melding) melding.textContent = svar;
    if (tekst) {
      tekst.textContent = ok ? 'Kopiert' : 'Kunne ikke kopiere';
      setTimeout(() => {
        tekst.textContent = original;
      }, 2000);
    }
  });
});

// ——— Lytt (talesyntese). Knappen er skjult til nettleseren støtter det ———
const lytt = document.querySelector<HTMLButtonElement>('.lytt');
if (lytt && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
  lytt.hidden = false;
  const etikett = lytt.querySelector('.tekst');
  let stemmer: SpeechSynthesisVoice[] = [];
  const lastStemmer = () => {
    stemmer = speechSynthesis.getVoices();
  };
  lastStemmer();
  // getVoices() er ofte tom første gang; listen kommer med voiceschanged.
  speechSynthesis.addEventListener?.('voiceschanged', lastStemmer);

  const avsnitt = () =>
    [document.querySelector('.na-hode h1'), document.querySelector('.na-ingress'), ...document.querySelectorAll('.na-tekst .prose p')]
      .map((el) => el?.textContent?.trim() ?? '')
      .filter(Boolean);

  let runde = 0;
  const sett = (spiller: boolean) => {
    lytt.setAttribute('aria-pressed', String(spiller));
    lytt.setAttribute('aria-label', spiller ? 'Stopp opplesing' : 'Lytt til saken');
    if (etikett) etikett.textContent = spiller ? 'Stopp' : 'Lytt';
  };
  const stopp = () => {
    runde++;
    speechSynthesis.cancel();
    sett(false);
  };

  lytt.addEventListener('click', () => {
    if (lytt.getAttribute('aria-pressed') === 'true') return stopp();
    if (stemmer.length === 0) lastStemmer();
    const i = velgStemme(stemmer);
    const denne = ++runde;
    const biter = avsnitt();
    if (biter.length === 0) return;
    speechSynthesis.cancel();
    // Ett avsnitt om gangen: lange innlesninger stopper ellers midtveis i enkelte nettlesere.
    biter.forEach((tekst, n) => {
      const u = new SpeechSynthesisUtterance(tekst);
      u.lang = 'nb-NO';
      if (i >= 0) u.voice = stemmer[i];
      u.rate = 0.95;
      const ferdig = () => {
        if (denne === runde && n === biter.length - 1) sett(false);
      };
      u.onend = ferdig;
      u.onerror = ferdig;
      speechSynthesis.speak(u);
    });
    sett(true);
  });
  addEventListener('pagehide', () => speechSynthesis.cancel());
}

// ——— Fremdrift og «Fortsett der du slapp» ———
const tekstEl = document.querySelector<HTMLElement>('.na-tekst .prose');
const linje = document.querySelector<HTMLElement>('.na-fremdrift span');
const nokkel = lagringsnokkel(location.pathname);
if (tekstEl) {
  let sist = 0;
  const les = () => {
    const r = tekstEl.getBoundingClientRect();
    return fremdrift(r.top, r.height, innerHeight);
  };
  const tegn = () => {
    const s = les();
    if (linje) linje.style.width = `${(s * 100).toFixed(1)}%`;
    return s;
  };
  let timer: number | undefined;
  const lagrePosisjon = () => {
    const s = tegn();
    if (s > 0.95) fjern(nokkel);
    else if (s >= 0.1) lagre(nokkel, s.toFixed(3));
  };
  addEventListener(
    'scroll',
    () => {
      const na = Date.now();
      if (na - sist > 50) {
        sist = na;
        tegn();
      }
      clearTimeout(timer);
      timer = window.setTimeout(lagrePosisjon, 500);
    },
    { passive: true },
  );
  tegn();

  const banner = document.querySelector<HTMLElement>('.na-fortsett');
  const tilbake = fortsettFra(hent(nokkel));
  if (banner && tilbake !== null && scrollY < 200) {
    banner.hidden = false;
    banner.querySelector('button')?.addEventListener('click', () => {
      const r = tekstEl.getBoundingClientRect();
      const mal = r.top + scrollY + tilbake * r.height - innerHeight * 0.6;
      scrollTo({ top: Math.max(0, mal), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      banner.hidden = true;
    });
  }
}

// ——— Ordforklaringer: <button class="ord" data-lemma data-def> i teksten åpner én felles ballong ———
// Definisjonen settes med textContent (aldri som HTML). Lukkes med Esc, klikk utenfor, et annet ord, rulling,
// endret vindusstørrelse og nytt klikk på samme ord. Ballongen står rett under ordet og holdes innenfor skjermen.
{
  let ballong: HTMLDivElement | null = null;
  let aktiv: HTMLButtonElement | null = null;
  const MARG = 12;

  const lag = (): HTMLDivElement => {
    if (ballong) return ballong;
    const b = document.createElement('div');
    b.className = 'ord-ballong';
    b.id = 'ord-ballong';
    b.setAttribute('role', 'tooltip');
    b.hidden = true;
    document.body.append(b);
    ballong = b;
    return b;
  };

  const plasser = () => {
    if (!ballong || !aktiv) return;
    const bredde = document.documentElement.clientWidth;
    ballong.style.maxWidth = `${Math.min(288, bredde - 2 * MARG - 6)}px`;
    const rekker = aktiv.getClientRects();
    const r = rekker[rekker.length - 1] ?? aktiv.getBoundingClientRect();
    const venstre = Math.max(MARG, Math.min(r.left, bredde - ballong.offsetWidth - MARG - 6));
    ballong.style.left = `${Math.round(venstre + scrollX)}px`;
    ballong.style.top = `${Math.round(r.bottom + scrollY + 8)}px`;
  };

  const lukk = (fokus = false) => {
    if (!aktiv) return;
    const knapp = aktiv;
    knapp.setAttribute('aria-expanded', 'false');
    knapp.removeAttribute('aria-describedby');
    if (ballong) ballong.hidden = true;
    aktiv = null;
    if (fokus) knapp.focus();
  };

  const apne = (knapp: HTMLButtonElement) => {
    const def = knapp.dataset.def;
    if (!def) return;
    lukk();
    const b = lag();
    b.replaceChildren();
    const ord = document.createElement('b');
    ord.textContent = knapp.dataset.lemma ?? knapp.textContent ?? '';
    const tekst = document.createElement('p');
    tekst.className = 'def';
    tekst.textContent = def;
    const kilde = document.createElement('small');
    kilde.append('Bokmålsordboka, Universitetet i Bergen og Språkrådet, CC BY 4.0 · ');
    const lenke = document.createElement('a');
    lenke.href = 'https://ordbokene.no';
    lenke.rel = 'noopener';
    lenke.textContent = 'ordbokene.no';
    kilde.append(lenke);
    b.append(ord, tekst, kilde);
    b.hidden = false;
    aktiv = knapp;
    knapp.setAttribute('aria-expanded', 'true');
    knapp.setAttribute('aria-describedby', b.id);
    plasser();
  };

  document.addEventListener('click', (e) => {
    const t = e.target as Element | null;
    const knapp = t?.closest?.('button.ord') as HTMLButtonElement | null;
    if (knapp) {
      if (knapp === aktiv) lukk();
      else apne(knapp);
    } else if (aktiv && !t?.closest?.('.ord-ballong')) lukk();
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') lukk(true);
  });
  addEventListener('scroll', () => lukk(), { passive: true });
  addEventListener('resize', () => lukk());
}

// ——— «Var saken nyttig?» (anonym telling; ett svar per sak og nettleser) ———
const nyttig = document.querySelector<HTMLElement>('.na-nyttig[data-slug]');
if (nyttig) {
  const slug = nyttig.dataset.slug as string;
  const nokkel = `nyttig:${slug}`;
  const knapper = nyttig.querySelectorAll<HTMLButtonElement>('button[data-svar]');
  const takk = nyttig.querySelector<HTMLElement>('.takk');
  const ferdig = () => {
    knapper.forEach((b) => {
      b.disabled = true;
      b.hidden = true;
    });
    nyttig.querySelector<HTMLElement>('.spm')?.setAttribute('hidden', '');
    if (takk) takk.hidden = false;
  };
  nyttig.hidden = false;
  if (hent(nokkel)) ferdig();
  else
    knapper.forEach((b) =>
      b.addEventListener('click', () => {
        const svar = b.dataset.svar;
        knapper.forEach((k) => (k.disabled = true));
        lagre(nokkel, '1');
        fetch('/api/nyttig', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug, svar }), keepalive: true }).catch(() => {});
        ferdig();
      }),
    );
}

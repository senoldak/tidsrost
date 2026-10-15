// Sürekli güncel veri sayfaları: scripts/data/hent-data.mjs'in yazdığı JSON'lar (resmi kaynaklar, anahtarsız API'ler).
// Değerler olduğu gibi gösterilir; hiçbir şey tahmin edilmez. Veri eskiyse sayfa bunu açıkça söyler.
import renteData from '../data/styringsrente.json';
import varselData from '../data/farevarsler.json';

export interface Renteendring {
  fra: string;
  rente: number;
  forrige: number;
}

export interface Farevarsel {
  id: string;
  niva: 'gult' | 'oransje' | 'rodt';
  hendelse: string;
  omrade: string;
  domene: 'land' | 'hav';
  start: string | null;
  slutt: string | null;
  beskrivelse: string;
  konsekvenser: string;
  rad: string;
  web: string | null;
}

export const RENTE = renteData as typeof renteData & { gjeldendeFra: string | null; endringer: Renteendring[] };
export const VARSLER = varselData as typeof varselData & { varsler: Farevarsel[] };

// Bu süreden eski veri "güncellenemedi" uyarısıyla gösterilir (bot ~2 saatte bir çalışır; gece arası var).
export const GAMMEL_RENTE_MS = 3 * 86_400_000;
export const GAMMEL_VARSEL_MS = 12 * 3_600_000;

export const erGammel = (hentet: string, grense: number, naa = new Date()) => naa.getTime() - new Date(hentet).getTime() > grense;

/** Derleme anında hâlâ geçerli ya da yaklaşan uyarılar (bitişi geçmiş olanlar gösterilmez). */
export function aktiveVarsler(naa = new Date()): Farevarsel[] {
  return VARSLER.varsler.filter((v) => !v.slutt || new Date(v.slutt).getTime() > naa.getTime());
}

export const NIVA_NAVN: Record<Farevarsel['niva'], string> = { gult: 'Gult', oransje: 'Oransje', rodt: 'Rødt' };

export const prosent = (n: number) => `${n.toLocaleString('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

export const datoTekst = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo' });

// "torsdag 15. oktober kl. 22.10" (Norveççe saat yazımı nokta ile).
export const tidTekst = (iso: string) =>
  new Date(iso)
    .toLocaleString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
    .replace(/(\d{2}):(\d{2})/, '$1.$2');

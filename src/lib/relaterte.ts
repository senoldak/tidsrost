// "Relaterte saker": haber sayfasının altındaki ilgili haberler, derlemede deterministik olarak seçilir.
// Ölçü ortak varlıklardır: src/lib/entities.ts'teki kurumlar/kişiler (Stortinget, Norges Bank…) ile metindeki
// özel isimler ve başlık terimleri (scripts/nyheter/dublett.mjs'teki enheter()/termer(), bot da aynısını kullanır).
// Yeterince ortak varlığı olan haber yoksa aynı kategorinin en yeni haberleriyle tamamlanır.
// Kort fortalt (günlük toplu kısa haber listesi) ve bültenler, kısa (noindex) haberler ve haberin kendisi seçilmez.
import { enheter, termer } from '../../scripts/nyheter/dublett.mjs';
import { matchEntities } from './entities.ts';
import { indekserbar } from './ordtelling.mjs';
import type { Haber } from './news.ts';
import { anlamBenzerligi, anlamPuani, vektorleriOku } from './anlam.mjs';

// Gemini Faz 2 (27 Ekim): ortaklık puanına anlam benzerliği eklenir (src/data/vektorler.jsonl, kimlik = haber id'si).
// Vektör yoksa 0 puan: seçim bugünkü gibi. MIN_POENG anlam payını da içeren toplamla karşılaştırılır.
export type Anlam = (a: Haber, b: Haber) => number | null;
// Buradaki ölçek öbür sitelerden büyük (kurum 3, isim 2, terim 1; eşik MIN_POENG 4): anlam payı (0–4) iki katı sayılır,
// yoksa tek başına eşiğe ancak benzerlik 1 iken ulaşırdı. 2 kat ile ≈0,78 ve üstü tek başına yeter.
const ANLAM_KATSAYI = 2;
const varsayilanAnlam: Anlam = (a, b) => anlamBenzerligi(vektorleriOku(), a.id, b.id);

export const RELATERT_ANTALL = 4;
// En az bu puanda ortaklık "ilgili" sayılır (ör. bir kurum + bir özel isim ya da iki özel isim).
const MIN_POENG = 4;
// Haberlerin bu oranından fazlasında geçen özel isim/terim ayırt edici değildir (ör. "Norge", ay adları).
const MAKS_ANDEL = 0.06;

/** Toplu haber listeleri: Kort fortalt ve bültenler (tek bir olayı anlatmaz). */
export const erSammendrag = (h: Haber) => /^kort-fortalt-|bulletin|bulten/.test(h.id);

/** İlgili haber listesine girebilir mi? */
export const kanRelateres = (h: Haber) => !erSammendrag(h) && indekserbar(h.body);

// Gövdeden kaynak satırı ve link adresleri çıkarılır: kaynak adı ortaklık sayılmasın.
const renTekst = (body = '') =>
  body
    .replace(/^\s*\*Kilder?:.*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ');

const sayiMi = (t: string) => /^\d+(?:\.\d+)?$/.test(t);

interface Profil {
  haber: Haber;
  kurum: Set<string>;
  isim: Set<string>;
  baslik: Set<string>;
}

function profil(h: Haber): Profil {
  const { title, description } = h.data;
  const govde = renTekst(h.body ?? '');
  return {
    haber: h,
    kurum: new Set(matchEntities(`${title} ${description} ${govde}`).map((e) => e.name)),
    // Yalın sayılar (yıllar, tutarlar) olayı ayırt etmez; kodlar (A3, E6) kalır.
    isim: new Set([...(enheter(`${title}. ${description}\n${govde}`) as Set<string>)].filter((t) => !sayiMi(t))),
    baslik: new Set([...(termer(title) as Set<string>)].filter((t) => !sayiMi(t))),
  };
}

/**
 * Her haber için ilgili haberleri hesaplar (haber listesi yeniden eskiye sıralı gelir, bkz. getNews).
 * Ters dizinle çalışır: yalnızca en az bir ortak terimi olan çiftler puanlanır.
 */
export function relaterteSaker(news: Haber[], antall = RELATERT_ANTALL, anlam: Anlam = varsayilanAnlam): Map<string, Haber[]> {
  const adaylar = news.filter(kanRelateres);
  const profiller = adaylar.map(profil);
  const grense = Math.max(3, Math.ceil(adaylar.length * MAKS_ANDEL));

  // terim → profil sırası; çok yaygın terimler atılır.
  const dizin = new Map<string, number[]>();
  profiller.forEach((p, i) => {
    for (const t of p.kurum) (dizin.get(`k:${t}`) ?? dizin.set(`k:${t}`, []).get(`k:${t}`)!).push(i);
    for (const t of p.isim) (dizin.get(`i:${t}`) ?? dizin.set(`i:${t}`, []).get(`i:${t}`)!).push(i);
    for (const t of p.baslik) (dizin.get(`b:${t}`) ?? dizin.set(`b:${t}`, []).get(`b:${t}`)!).push(i);
  });
  const AGIRLIK: Record<string, number> = { k: 3, i: 2, b: 1 };

  const sonuc = new Map<string, Haber[]>();
  for (const h of news) {
    const p = profil(h);
    const puan = new Map<number, number>();
    const ekle = (onek: string, terimler: Set<string>) => {
      for (const t of terimler) {
        const liste = dizin.get(`${onek}:${t}`);
        if (!liste || liste.length > grense) continue;
        for (const j of liste) puan.set(j, (puan.get(j) ?? 0) + AGIRLIK[onek]);
      }
    };
    ekle('k', p.kurum);
    ekle('i', p.isim);
    ekle('b', p.baslik);
    adaylar.forEach((a, j) => {
      const ek = a === h ? 0 : ANLAM_KATSAYI * anlamPuani(anlam(h, a));
      if (ek > 0) puan.set(j, (puan.get(j) ?? 0) + ek);
    });

    const secilen = [...puan]
      .filter(([j, n]) => n >= MIN_POENG && adaylar[j] !== h)
      // Yüksek puan önce; eşitlikte daha yeni haber (adaylar zaten yeniden eskiye sıralı).
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, antall)
      .map(([j]) => adaylar[j]);

    // Yedek: aynı kategorinin en yeni haberleri.
    for (const a of adaylar) {
      if (secilen.length >= antall) break;
      if (a !== h && a.data.category === h.data.category && !secilen.includes(a)) secilen.push(a);
    }
    sonuc.set(h.id, secilen);
  }
  return sonuc;
}

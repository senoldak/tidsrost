// Açık kamu verilerinden haber üretir ve src/content/haberler altına yazar.
// Kullanım: node scripts/nyheter/hent-nyheter.mjs [--torr]   (--torr: dosya yazmadan sadece listeler)
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL, MAKS_PER_KJORING (varsayılan 12)
import path from 'node:path';
import { writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { skrivSak, lesJsonFil } from './lib.mjs';
import { vurder, velg } from './viktighet.mjs';
import regjeringen from './kilder/regjeringen.mjs';
import norgesbank from './kilder/norgesbank.mjs';
import met from './kilder/met.mjs';
import nve from './kilder/nve.mjs';
import stortinget from './kilder/stortinget.mjs';
import udi from './kilder/udi.mjs';
import medier from './kilder/medier.mjs';
import { ssb, nkom, mattilsynet, datatilsynet, kulturdirektoratet, norgesbankPresse, finanstilsynet, konkurransetilsynet, skatteetaten,
  vegvesen, fhi, dsb, havforskning, sivilombudet, forbrukerradet, idrettsforbundet, norfund,
  unnews, eukommisjonen, statnett, arbeidstilsynet, kystverket, helsedirektoratet, miljodirektoratet } from './kilder/etater.mjs';

// medier: haber siteleri, en az iki sitede çıkan olaylar (bkz. kilder/medier.mjs).
const KILDER = [medier, norgesbank, met, nve, stortinget, udi, regjeringen, ssb, nkom, mattilsynet, datatilsynet, kulturdirektoratet, norgesbankPresse, finanstilsynet, konkurransetilsynet, skatteetaten,
  vegvesen, fhi, dsb, havforskning, sivilombudet, forbrukerradet, idrettsforbundet, norfund,
  unnews, eukommisjonen, statnett, arbeidstilsynet, kystverket, helsedirektoratet, miljodirektoratet];

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const TILSTAND_FIL = path.join(HER, 'sett.json');
const TORR = process.argv.includes('--torr');
const MAKS = Number(process.env.MAKS_PER_KJORING || 12);
// Bir kaynak ilk kez çalıştığında eski birikim yayınlanmaz: sadece son 24 saatin haberleri alınır
// (önceden sadece en yeni 2 haber alınıyordu; yeni eklenen kaynakların o günkü haberleri kayboluyordu).
const FORSTE_GANG_TIMER = 24;
const MAKS_FEIL = 3;

const tilstand = await lesJsonFil(TILSTAND_FIL, { sett: {}, feil: {}, kilder: {} });
// Bir aday birden fazla kaynak öğesini kapsayabilir (medier: aynı olayın bütün siteleri); hepsi görüldü sayılır.
const merkSett = (k) => {
  for (const id of k.ider ?? [k.id]) tilstand.sett[id] = new Date().toISOString();
};

// Her kaynaktan yeni (görülmemiş) adaylar.
const kandidater = {};
for (const kilde of KILDER) {
  try {
    let liste = (await kilde.hent({ sett: tilstand.sett })).filter((k) => !tilstand.sett[k.id]);
    for (const id of kilde.alleredeSett ?? []) tilstand.sett[id] = new Date().toISOString();
    liste.sort((a, b) => b.tid - a.tid);
    if (!tilstand.kilder[kilde.navn]) {
      const grense = Date.now() - FORSTE_GANG_TIMER * 36e5;
      const forste = kilde.forsteGang ? liste.slice(0, kilde.forsteGang) : liste.filter((k) => k.tid.getTime() >= grense);
      for (const k of liste) if (!forste.includes(k)) merkSett(k);
      liste = forste;
      tilstand.kilder[kilde.navn] = new Date().toISOString();
    }
    kandidater[kilde.navn] = liste;
    console.log(`${kilde.navn}: ${liste.length} nye`);
  } catch (e) {
    console.error(`${kilde.navn}: FEIL ${e.message}`);
    kandidater[kilde.navn] = [];
  }
}

// Haber değerine göre seç (bkz. viktighet.mjs). Gemini cevap vermezse puansız, kaynaklar arasında sırayla.
const poeng = await vurder(kandidater).catch((e) => {
  console.error(`viktighet: FEIL ${e.message}`);
  return null;
});
if (!poeng) console.warn('viktighet: ingen vurdering; velger uten poeng');
const { valgt, forkastet } = velg(kandidater, poeng, MAKS);
for (const k of forkastet) {
  console.log(`  - ${k.id}: lav nyhetsverdi (${poeng.get(k)})`);
  if (!TORR) merkSett(k);
}

let antall = 0;
const feilListe = [];
const utkastListe = [];
const rettetListe = [];
const stoppListe = [];
for (const k of valgt) {
  if (TORR) {
    console.log(`  [tørr] ${k.id} — ${k.tittel}`);
    continue;
  }
  try {
    const sak = await k.lag();
    if (!sak) {
      console.log(`  - ${k.id}: hoppet over (mangler GEMINI_API_KEY)`);
      feilListe.push(`${k.id}: hoppet over, GEMINI_API_KEY mangler`);
      continue;
    }
    if (sak.hopp) {
      merkSett(k);
      console.log(`  - ${k.id}: hoppet over (${sak.hopp})`);
      feilListe.push(`${k.id} «${k.tittel}»: hoppet over, ${sak.hopp}`);
      continue;
    }
    const slug = await skrivSak(ROT, sak);
    merkSett(k);
    delete tilstand.feil[k.id];
    antall++;
    console.log(`  + ${slug}${sak.draft ? ' (utkast)' : ''}`);
    if (sak.stopp?.length) stoppListe.push(`${sak.title} — ${sak.stopp.join(' / ')}`);
    else if (sak.draft) utkastListe.push(`${sak.title}${sak.merknader?.length ? ` — ${sak.merknader.join(' / ')}` : ''}`);
    else if (sak.merknader?.length) rettetListe.push(`${sak.title} — ${sak.merknader.join(' / ')}`);
  } catch (e) {
    // Hata mesajı durum dosyasına da yazılır; loglara bakmadan görülebilsin.
    const melding = `${e.message}${e.cause ? ` (${e.cause.message ?? e.cause})` : ''}`.slice(0, 500);
    const forrige = tilstand.feil[k.id];
    const tidligere = typeof forrige === 'number' ? forrige : forrige?.antall ?? 0;
    const ant = e.konfig ? tidligere : tidligere + 1;
    tilstand.feil[k.id] = { antall: ant, melding, tid: new Date().toISOString() };
    feilListe.push(`${k.id}: ${melding}`);
    console.error(`  ! ${k.id}: ${melding}`);
    if (ant >= MAKS_FEIL) {
      merkSett(k);
      delete tilstand.feil[k.id];
    }
  }
}

// 90 günden eski kayıtları temizle.
const grense = Date.now() - 90 * 864e5;
for (const [id, t] of Object.entries(tilstand.sett)) if (Date.parse(t) < grense) delete tilstand.sett[id];

if (!TORR) await writeFile(TILSTAND_FIL, JSON.stringify(tilstand, null, 2) + '\n', 'utf8');
console.log(`Ferdig: ${antall} nye saker.`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `antall=${antall}\n`);
// Actions çalışma sayfasında görünen özet.
if (process.env.GITHUB_STEP_SUMMARY) {
  const ozet = [
    `### Nyhetsbot: ${antall} nye saker`,
    ...stoppListe.map((t) => `- ⛔ Yayınlanmadı (kaynakta olmayan rakam/alıntı), taslakta bekliyor (/admin): ${t}`),
    ...utkastListe.map((t) => `- 📝 Taslak, kontrol edilip yayınlanmayı bekliyor (/admin): ${t}`),
    ...rettetListe.map((t) => `- ✏️ Kontrol düzeltti ve yayınlandı: ${t}`),
    ...feilListe.map((f) => `- ❌ ${f}`),
  ].join('\n');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, ozet + '\n');
}

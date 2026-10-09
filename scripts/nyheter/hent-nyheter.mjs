// Açık kamu verilerinden haber üretir ve src/content/haberler altına yazar.
// Kullanım: node scripts/nyheter/hent-nyheter.mjs [--torr]   (--torr: dosya yazmadan sadece listeler)
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL, MAKS_PER_KJORING (varsayılan 8)
import path from 'node:path';
import { writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { skrivSak, lesJsonFil, sleep } from './lib.mjs';
import regjeringen from './kilder/regjeringen.mjs';
import norgesbank from './kilder/norgesbank.mjs';
import met from './kilder/met.mjs';

const KILDER = [norgesbank, met, regjeringen];

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const TILSTAND_FIL = path.join(HER, 'sett.json');
const TORR = process.argv.includes('--torr');
const MAKS = Number(process.env.MAKS_PER_KJORING || 8);
// Bir kaynak ilk kez çalıştığında eski haberleri yığmamak için sadece en yeni birkaçını al.
const FORSTE_GANG = 2;
const MAKS_FEIL = 3;

const tilstand = await lesJsonFil(TILSTAND_FIL, { sett: {}, feil: {}, kilder: {} });

// Her kaynaktan yeni (görülmemiş) adaylar.
const kandidater = {};
for (const kilde of KILDER) {
  try {
    let liste = (await kilde.hent()).filter((k) => !tilstand.sett[k.id]);
    liste.sort((a, b) => b.tid - a.tid);
    if (!tilstand.kilder[kilde.navn]) {
      for (const k of liste.slice(FORSTE_GANG)) tilstand.sett[k.id] = new Date().toISOString();
      liste = liste.slice(0, FORSTE_GANG);
      tilstand.kilder[kilde.navn] = new Date().toISOString();
    }
    kandidater[kilde.navn] = liste;
    console.log(`${kilde.navn}: ${liste.length} nye`);
  } catch (e) {
    console.error(`${kilde.navn}: FEIL ${e.message}`);
    kandidater[kilde.navn] = [];
  }
}

// Kaynaklar arasında sırayla seç (biri diğerlerini bastırmasın).
const valgt = [];
while (valgt.length < MAKS && Object.values(kandidater).some((l) => l.length)) {
  for (const liste of Object.values(kandidater)) {
    if (liste.length && valgt.length < MAKS) valgt.push(liste.shift());
  }
}

let antall = 0;
for (const [i, k] of valgt.entries()) {
  if (TORR) {
    console.log(`  [tørr] ${k.id} — ${k.tittel}`);
    continue;
  }
  try {
    const sak = await k.lag();
    if (!sak) {
      console.log(`  - ${k.id}: hoppet over (mangler GEMINI_API_KEY)`);
      continue;
    }
    const slug = await skrivSak(ROT, sak);
    tilstand.sett[k.id] = new Date().toISOString();
    delete tilstand.feil[k.id];
    antall++;
    console.log(`  + ${slug}`);
  } catch (e) {
    tilstand.feil[k.id] = (tilstand.feil[k.id] ?? 0) + 1;
    console.error(`  ! ${k.id}: ${e.message}`);
    if (tilstand.feil[k.id] >= MAKS_FEIL) {
      tilstand.sett[k.id] = new Date().toISOString();
      delete tilstand.feil[k.id];
    }
  }
  // Gemini ücretsiz katmanında dakikalık sınırı aşmamak için.
  if (process.env.GEMINI_API_KEY && i < valgt.length - 1) await sleep(7_000);
}

// 90 günden eski kayıtları temizle.
const grense = Date.now() - 90 * 864e5;
for (const [id, t] of Object.entries(tilstand.sett)) if (Date.parse(t) < grense) delete tilstand.sett[id];

if (!TORR) await writeFile(TILSTAND_FIL, JSON.stringify(tilstand, null, 2) + '\n', 'utf8');
console.log(`Ferdig: ${antall} nye saker.`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `antall=${antall}\n`);

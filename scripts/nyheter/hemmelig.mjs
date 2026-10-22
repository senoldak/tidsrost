// Resmi olmayan haber kaynaklarının (haber siteleri, ajanslar) listesi ve izi repoda açık durmaz: AES-256-GCM ile şifrelenir.
// Anahtar KILDE_NOKKEL ortam değişkenindedir (GitHub Secret; yerelde kök dizindeki .env).
// Anahtar yoksa liste boş döner: testler ve site derlemesi anahtarsız çalışır, bot yalnızca resmi kaynakları okur.
//
// Kullanım:
//   node scripts/nyheter/hemmelig.mjs nokkel           yeni anahtar üretir (.env ve GitHub Secret'a konur)
//   node scripts/nyheter/hemmelig.mjs apne             şifreli listeyi hemmelige-kilder.json'a açar (git'e girmez)
//   node scripts/nyheter/hemmelig.mjs lukk             hemmelige-kilder.json'u şifreleyip .kryptert dosyasına yazar
//   node scripts/nyheter/hemmelig.mjs spor <sak.md>    bir haberin şifreli kaynak izini gösterir
import path from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
export const KRYPTERT_FIL = path.join(HER, 'kilder/hemmelige-kilder.kryptert');
export const APEN_FIL = path.join(HER, 'kilder/hemmelige-kilder.json');
const VERSJON = 'v1';

let mellomlager;
let testNokkel = false;
function nokkel() {
  if (mellomlager !== undefined) return mellomlager;
  if (!process.env.KILDE_NOKKEL && existsSync(path.join(ROT, '.env'))) {
    try {
      process.loadEnvFile(path.join(ROT, '.env'));
    } catch {
      // .env okunamazsa anahtarsız devam
    }
  }
  const ra = process.env.KILDE_NOKKEL;
  if (!ra) {
    // node --test altında anahtar yoksa (CI) sabit test anahtarı: kod ve özetler hesaplanır, şifreli liste okunmaz.
    if (process.env.NODE_TEST_CONTEXT) {
      testNokkel = true;
      return (mellomlager = Buffer.alloc(32, 7));
    }
    return (mellomlager = null);
  }
  const n = Buffer.from(ra, 'base64');
  if (n.length !== 32) throw new Error('KILDE_NOKKEL 32 baytlık base64 olmalı (node scripts/nyheter/hemmelig.mjs nokkel)');
  return (mellomlager = n);
}

export const harNokkel = () => nokkel() !== null;

// Herhangi bir JSON değerini "v1.<iv>.<şifreli+etiket>" metnine çevirir.
export function krypter(verdi, n = nokkel()) {
  if (!n) throw new Error('KILDE_NOKKEL yok; şifrelenemez');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', n, iv);
  const kropp = Buffer.concat([c.update(JSON.stringify(verdi), 'utf8'), c.final(), c.getAuthTag()]);
  return `${VERSJON}.${iv.toString('base64')}.${kropp.toString('base64')}`;
}

export function dekrypter(tekst, n = nokkel()) {
  if (!n) throw new Error('KILDE_NOKKEL yok; çözülemez');
  const [versjon, iv, kropp] = String(tekst).trim().split('.');
  if (versjon !== VERSJON || !iv || !kropp) throw new Error('şifreli metin biçimi tanınmadı');
  const b = Buffer.from(kropp, 'base64');
  const d = createDecipheriv('aes-256-gcm', n, Buffer.from(iv, 'base64'));
  d.setAuthTag(b.subarray(b.length - 16));
  return JSON.parse(Buffer.concat([d.update(b.subarray(0, b.length - 16)), d.final()]).toString('utf8'));
}

// Anahtarlı özet: aynı girdi hep aynı kısa kimliği verir, anahtar bilinmeden girdi tahmin edilip doğrulanamaz.
export function hmacId(tekst, n = nokkel()) {
  if (!n) throw new Error('KILDE_NOKKEL yok; özet çıkarılamaz');
  return createHmac('sha256', n).update(String(tekst)).digest('hex').slice(0, 16);
}

// Kaynağın loglarda adı yerine geçen kısa kod.
export const kildeKode = (navn, n = nokkel()) => `k${hmacId(`kode:${navn}`, n).slice(0, 6)}`;

// Haberin resmi olmayan kaynaklarını ({ navn, url } listesi) frontmatter'a girecek şifreli metne çevirir.
// Kaynak yoksa ya da anahtar yoksa undefined: alan hiç yazılmaz.
export function kildeSpor(liste) {
  const unike = [];
  for (const k of liste ?? []) if (k?.url && !unike.some((x) => x.url === k.url)) unike.push({ navn: k.navn, url: k.url });
  return unike.length && harNokkel() ? krypter(unike) : undefined;
}

// Hata mesajındaki adresleri siler: açık Actions loglarına kaynak adresi düşmesin.
export const fjernAdresser = (melding) => String(melding).replace(/https?:\/\/\S+/gi, '[adresse]');

// { feeder: [{ medie, feed }], medienavn: [navn] }
// medienavn: metinde anılmaması gereken ek yayın adları (tekstverktoy.mjs genel listesine eklenir).
export function hemmeligeKilder({ fil = KRYPTERT_FIL, n = nokkel(), varsle = console.warn } = {}) {
  const tom = { feeder: [], medienavn: [] };
  if (!n) {
    varsle('ADVARSEL: KILDE_NOKKEL yok; şifreli kaynaklar okunmadı, yalnızca resmi kaynaklar kullanılacak.');
    return tom;
  }
  if (testNokkel && fil === KRYPTERT_FIL) return tom;
  if (!existsSync(fil)) {
    varsle(`ADVARSEL: ${path.basename(fil)} yok; şifreli kaynaklar okunmadı.`);
    return tom;
  }
  const v = dekrypter(readFileSync(fil, 'utf8'), n);
  return { feeder: v.feeder ?? [], medienavn: v.medienavn ?? [] };
}

// Akışlardaki site adları (tekil) ve ek medya adları.
export function hemmeligeMedienavn(h = hemmeligeKilder({ varsle: () => {} })) {
  return [...new Set([...h.feeder.map((f) => f.medie), ...h.medienavn])];
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [kommando, arg] = process.argv.slice(2);
  if (kommando === 'nokkel') {
    console.log(randomBytes(32).toString('base64'));
  } else if (kommando === 'apne') {
    writeFileSync(APEN_FIL, JSON.stringify(dekrypter(readFileSync(KRYPTERT_FIL, 'utf8')), null, 2) + '\n');
    console.log(`Açıldı: ${path.relative(ROT, APEN_FIL)} (git'e girmez; düzenleyip "lukk" çalıştırın)`);
  } else if (kommando === 'lukk') {
    writeFileSync(KRYPTERT_FIL, krypter(JSON.parse(readFileSync(APEN_FIL, 'utf8'))) + '\n');
    console.log(`Şifrelendi: ${path.relative(ROT, KRYPTERT_FIL)}`);
  } else if (kommando === 'spor' && arg) {
    const m = readFileSync(arg, 'utf8').match(/^kildeSpor:\s*"?([^"\n]+)"?$/m);
    console.log(m ? JSON.stringify(dekrypter(m[1]), null, 2) : 'Bu haberde kaynak izi yok.');
  } else {
    console.log('Kullanım: node scripts/nyheter/hemmelig.mjs nokkel | apne | lukk | spor <sak.md>');
    process.exitCode = 1;
  }
}

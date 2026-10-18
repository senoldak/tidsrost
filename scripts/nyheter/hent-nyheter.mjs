// Açık kamu verilerinden haber üretir ve src/content/haberler altına yazar.
// Kullanım: node scripts/nyheter/hent-nyheter.mjs [--torr]   (--torr: dosya yazmadan sadece listeler)
// Ortam değişkenleri: GEMINI_API_KEY, GEMINI_MODEL, MAKS_PER_KJORING (varsayılan 12), SURE_DK (varsayılan 15),
// KILDE_NOKKEL (haber sitelerinin şifreli listesi; bkz. hemmelig.mjs)
import path from 'node:path';
import { writeFile, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { skrivSak, lesJsonFil, mdKacir } from './lib.mjs';
import { butceYukle, geminiPayiBitti } from './butce.mjs';
import { vurder, velg, puanTemizle, UTEN_VURDERING } from './viktighet.mjs';
import { lesHukommelse, finnDublett, nokkel } from './dublett.mjs';
import { fjernAdresser } from './hemmelig.mjs';
import { maskerMedier } from './tekstverktoy.mjs';
import { leggTilKortFortalt } from './kortfortalt.mjs';
import regjeringen from './kilder/regjeringen.mjs';
import norgesbank from './kilder/norgesbank.mjs';
import met from './kilder/met.mjs';
import nve from './kilder/nve.mjs';
import stortinget from './kilder/stortinget.mjs';
import medier from './kilder/medier.mjs';
import { ssb, nkom, mattilsynet, datatilsynet, kulturdirektoratet, norgesbankPresse, finanstilsynet, konkurransetilsynet, skatteetaten,
  vegvesen, fhi, dsb, havforskning, sivilombudet, forbrukerradet, idrettsforbundet, norfund,
  unnews, eukommisjonen, statnett, arbeidstilsynet, kystverket, helsedirektoratet, miljodirektoratet } from './kilder/etater.mjs';

// UDI (kilder/udi.mjs) listede yok: udi.no Azure WAF bot denetimiyle veri merkezi IP'lerini kesiyor (GitHub Actions ve
// Cloudflare çıkışı 403, 2026-10-17); API ya da açık veri kaydı yok. UDI erişim izni verirse geri eklenir.
// medier: haber siteleri, en az iki sitede çıkan olaylar (bkz. kilder/medier.mjs).
const KILDER = [medier, norgesbank, met, nve, stortinget, regjeringen, ssb, nkom, mattilsynet, datatilsynet, kulturdirektoratet, norgesbankPresse, finanstilsynet, konkurransetilsynet, skatteetaten,
  vegvesen, fhi, dsb, havforskning, sivilombudet, forbrukerradet, idrettsforbundet, norfund,
  unnews, eukommisjonen, statnett, arbeidstilsynet, kystverket, helsedirektoratet, miljodirektoratet];

const HER = path.dirname(fileURLToPath(import.meta.url));
const ROT = path.resolve(HER, '../..');
const TILSTAND_FIL = path.join(HER, 'sett.json');
const TORR = process.argv.includes('--torr');
const MAKS = Number(process.env.MAKS_PER_KJORING || 12);
const SURE_MS = Number(process.env.SURE_DK || 15) * 60_000;
const BASLANGIC = Date.now();

// Katman 3 (Gemini kota planı): bu turun Gemini payı; yeni habere başlamadan önce geminiPayiBitti() sorulur.
if (!TORR) console.log(await butceYukle({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'tidsrost' }));
// Bir kaynak ilk kez çalıştığında eski birikim yayınlanmaz: sadece son 24 saatin haberleri alınır
// (önceden sadece en yeni 2 haber alınıyordu; yeni eklenen kaynakların o günkü haberleri kayboluyordu).
const FORSTE_GANG_TIMER = 24;
const MAKS_FEIL = 3;

const tilstand = await lesJsonFil(TILSTAND_FIL, { sett: {}, feil: {}, kilder: {} });
// Repo ve Actions logları herkese açık: haber sitelerinden gelen adayın (skjult) başlığı loglanmaz, mesajlarındaki
// adresler ve medya adları maskelenir (bkz. hemmelig.mjs). Resmi kaynaklarda her şey olduğu gibi yazılır.
const rens = (k, tekst) => (k.skjult ? maskerMedier(fjernAdresser(tekst)) : tekst);
const etikett = (k) => (k.skjult ? k.id : `${k.id} «${k.tittel}»`);
// Son 72 saatte yayınlanmış haberler (bkz. dublett.mjs): aynı olay başka adresten gelince yeniden yazılmasın.
const hukommelse = await lesHukommelse(ROT);
// medier adaylarının başlığının sonundaki parantez karşılaştırmada atılır.
const kandidatTittel = (k) => k.tittel.replace(/\s*\([^)]*\)\s*$/, '');
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
    for (const k of liste) k.kildeNavn = kilde.navn;
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
    console.error(`${kilde.navn}: FEIL ${rens(kilde, e.message)}`);
    kandidater[kilde.navn] = [];
  }
}

// Haber değerine göre seç (bkz. viktighet.mjs). Gemini cevap vermezse puansız, kaynaklar arasında sırayla.
tilstand.puan ??= {};
const poeng = await vurder(kandidater, { hukommelse: tilstand.puan }).catch((e) => {
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
const kortListe = [];
for (const k of valgt) {
  // Ön denetim (Gemini çağrısından önce): kaynağın kendi başlığı yayınlanmış bir haberle aynı olayı anlatıyor mu?
  // Şablonlu veri kaynaklarında kaynak başlığı yayınlanan başlıktan farklıdır; onlar yazıldıktan sonra denetlenir.
  const forDublett = UTEN_VURDERING.has(k.kildeNavn) ? undefined : finnDublett(hukommelse, { tittel: kandidatTittel(k) });
  if (forDublett) {
    console.log(`  - ${k.id}: allerede publisert (${forDublett.slug})`);
    if (!TORR) merkSett(k);
    continue;
  }
  if (TORR) {
    console.log(`  [tørr] ${k.skjult ? `${k.id} (${k.ider?.length ?? 1} saker)` : `${k.id} — ${k.tittel}`}`);
    continue;
  }
  if (Date.now() - BASLANGIC > SURE_MS || geminiPayiBitti()) {
    console.log(
      Date.now() - BASLANGIC > SURE_MS
        ? `\nTidsbudsjett utløpt (${SURE_MS / 60_000} min); resterende saker spares til neste kjøring.`
        : '\nGemini-budsjettet for denne kjøringen er brukt opp; resterende saker spares til neste kjøring.',
    );
    break;
  }
  try {
    const sak = await k.lag();
    if (!sak) {
      console.log(`  - ${k.id}: hoppet over (mangler GEMINI_API_KEY)`);
      feilListe.push(`${k.id}: hoppet over, GEMINI_API_KEY mangler`);
      continue;
    }
    // Tam haber için kaynak yetmedi: resmi duyuru günün "Kort fortalt" sayfasına satır olur (bkz. kortfortalt.mjs).
    if ('kort' in sak) {
      merkSett(k);
      if (sak.kort) kortListe.push(sak.kort);
      console.log(`  ~ ${k.id}: ${sak.kort ? 'Kort fortalt' : 'hoppet over (for lite kildemateriale)'}`);
      continue;
    }
    if (sak.hopp) {
      merkSett(k);
      console.log(`  - ${k.id}: hoppet over (${rens(k, sak.hopp)})`);
      feilListe.push(`${etikett(k)}: hoppet over, ${rens(k, sak.hopp)}`);
      continue;
    }
    // Son denetim: yazılan başlık ve giriş, son 72 saatte (ya da bu çalışmada) yayınlanmış bir haberle aynı olay mı?
    const dublett = finnDublett(hukommelse, { tittel: sak.title, ingress: sak.description, tekst: sak.body }, { strengt: sak.produksjon === 'automatisk' });
    if (dublett) {
      merkSett(k);
      console.log(`  - ${k.id}: hoppet over (samme hendelse som ${dublett.slug})`);
      continue;
    }
    const slug = await skrivSak(ROT, sak);
    if (!sak.draft) hukommelse.push(nokkel({ slug, tittel: sak.title, ingress: sak.description, tekst: sak.body, tid: Date.now(), produksjon: sak.produksjon }));
    merkSett(k);
    delete tilstand.feil[k.id];
    antall++;
    console.log(`  + ${slug}${sak.draft ? ' (utkast)' : ''}`);
    if (sak.stopp?.length) stoppListe.push(`${sak.title} — ${rens(k, sak.stopp.join(' / '))}`);
    else if (sak.draft) utkastListe.push(`${sak.title}${sak.merknader?.length ? ` — ${rens(k, sak.merknader.join(' / '))}` : ''}`);
    else if (sak.merknader?.length) rettetListe.push(`${sak.title} — ${rens(k, sak.merknader.join(' / '))}`);
  } catch (e) {
    // Hata mesajı durum dosyasına da yazılır; loglara bakmadan görülebilsin.
    const melding = rens(k, `${e.message}${e.cause ? ` (${e.cause.message ?? e.cause})` : ''}`).slice(0, 500);
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

// Kısa resmi duyurular günün tek "Kort fortalt" sayfasına eklenir. Sayfa değiştiyse yayın tetiklensin diye
// sayıma bir olarak girer (iş akışı antall=0 iken derleme yapmaz).
let kortLagt = 0;
if (!TORR && kortListe.length) {
  kortLagt = await leggTilKortFortalt(ROT, kortListe);
  console.log(`  + Kort fortalt: ${kortLagt} nye linjer`);
  if (kortLagt) antall++;
}

puanTemizle(tilstand.puan);
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
    ...(kortLagt ? [`- 🗒️ Kort fortalt: ${kortLagt} kısa resmi duyuru eklendi`] : []),
    ...stoppListe.map((t) => `- ⛔ Yayınlanmadı (kaynakta olmayan rakam/alıntı), taslakta bekliyor: ${mdKacir(t)}`),
    ...utkastListe.map((t) => `- 📝 Taslak, kontrol edilip yayınlanmayı bekliyor: ${mdKacir(t)}`),
    ...rettetListe.map((t) => `- ✏️ Kontrol düzeltti ve yayınlandı: ${mdKacir(t)}`),
    ...feilListe.map((f) => `- ❌ ${mdKacir(f)}`),
  ].join('\n');
  await appendFile(process.env.GITHUB_STEP_SUMMARY, ozet + '\n');
}

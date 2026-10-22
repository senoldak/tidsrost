// Faktaark: kaynağa fazla yakın taslağı kaynak metni görmeden yeniden yazdırır.
//
// Norveççe kaynaktan Norveççe yazımda Gemini kaynağın cümlelerini aynen alıyor; yayın kapısı (kaynak-benzerligi)
// bu haberleri düşürüyordu. Kural gevşemez; bunun yerine taslak redaksiyondan önce yerelde ölçülür (naerhet) ve
// kapıdan sıkı bir iç eşiği aşarsa:
//   1. lagFaktaark: kaynaktan olgu listesi (rakam, ad, tarih, kim ne dedi, ≤ 10 kelimelik alıntılar).
//   2. skrivFraFaktaark: haber yalnız bu listeden yazılır; istemde kaynak metni YOKTUR, model cümleyi kopyalayamaz.
// Yeni metin sonra bütün kontrollerden (kesin kontroller, kontrol masası, kapı) kaynağa karşı geçer.
// FAKTAARK=0 adımı kapatır (çağıran bakar).
import { gemini } from './lib.mjs';
import { LENGDE_REGEL, TITTEL_REGEL, TEKST_SKJEMA, helTekst } from './redaktor.mjs';

// Kapı 12 kelime / %35'te düşürür. İç tetik kapının hemen altında: kapıdan rahat geçen taslaklara (resmî ad ve
// kanun başlıkları yüzünden doğal örtüşmesi olan istatistik haberleri) dokunulmaz, kaynaksız yazım riske girmez.
const TETIK_ARDISIK = 11;
const TETIK_ORAN = 0.28;
const PARCA = 6;
const ASGARI_KILDE = 40;

// Doğrudan alıntılar sayılmaz: aynen aktarılması zaten kural; uzunluğunu sjekkSitater ve istemler yönetir.
const SITAT = /«[^»]*»|"[^"]*"|“[^”]*”|„[^“”]*[“”]/gu;
const ord = (s) => String(s).replace(SITAT, ' ').toLocaleLowerCase('nb').match(/[\p{L}\p{N}]+/gu) ?? [];
const parcalar = (k, n) => {
  const p = new Set();
  for (let i = 0; i + n <= k.length; i++) p.add(k.slice(i, i + n).join(' '));
  return p;
};

export function naerhet(tekst, kilde) {
  const kk = String(kilde).toLocaleLowerCase('nb').match(/[\p{L}\p{N}]+/gu) ?? [];
  const km = ord(tekst);
  if (kk.length < ASGARI_KILDE || km.length < PARCA) return { ardisik: 0, oran: 0, tetik: false };
  // En uzun ortak dizi: kaynağın her n'li parçası kümede; n büyüdükçe arama yalnız eşleşmeyi sürdüren yerlerde.
  const kp = parcalar(kk, PARCA);
  let ardisik = 0;
  let akis = 0;
  for (let i = 0; i + PARCA <= km.length; i++) {
    akis = kp.has(km.slice(i, i + PARCA).join(' ')) ? akis + 1 : 0;
    if (akis) ardisik = Math.max(ardisik, akis + PARCA - 1);
  }
  const yp = parcalar(km, PARCA);
  let ortak = 0;
  for (const p of yp) if (kp.has(p)) ortak++;
  const oran = Math.round((yp.size ? ortak / yp.size : 0) * 100) / 100;
  return { ardisik, oran, tetik: ardisik >= TETIK_ARDISIK || oran >= TETIK_ORAN };
}

const FAKTA_SKJEMA = {
  type: 'object',
  properties: {
    fakta: { type: 'array', items: { type: 'string' }, description: 'Én opplysning per punkt, med hvem som står bak den' },
    sitater: {
      type: 'array',
      items: { type: 'object', properties: { hvem: { type: 'string' }, sitat: { type: 'string' } }, required: ['hvem', 'sitat'] },
    },
  },
  required: ['fakta'],
};

export async function lagFaktaark(kilde, { medier = false } = {}) {
  const svar = await gemini({
    schema: FAKTA_SKJEMA,
    prompt: `Du er researcher i en norsk nettavis. Lag et faktaark fra kilden under: en liste med opplysninger som en journalist kan skrive en nyhetssak fra uten å se kilden.

- Ett punkt per opplysning, som stikkord eller kort setning med EGNE ord. Ikke kopier setninger fra kilden.
- Ta med alle tall, navn, titler, steder, datoer og frister nøyaktig slik de står i kilden.
- Skriv hvem som står bak hver påstand, vurdering eller plan (f.eks. «(ifølge departementet)», «(mener NHO)»).
- Ta med bakgrunn og hva som skjer videre hvis kilden sier det.
- Sitater: høyst tre, hvert under 10 ord, ordrett fra kilden og med hvem som sa det.${medier ? '\n- Ikke nevn medier, aviser eller tv-kanaler, og utelat opplysninger som bare tilskrives et medie.' : ''}

KILDE:
${String(kilde).slice(0, 14000)}`,
  });
  return svar && Array.isArray(svar.fakta) && svar.fakta.length ? { fakta: svar.fakta, sitater: Array.isArray(svar.sitater) ? svar.sitater : [] } : null;
}

export async function skrivFraFaktaark(ark, sak, { medier = false } = {}) {
  const svar = await gemini({
    schema: TEKST_SKJEMA,
    prompt: `Du er nyhetsjournalist i nettavisen tidsrøst og arbeider etter Vær Varsom-plakaten. Skriv en nøytral, fullverdig nyhetssak på norsk bokmål fra faktaarket under. Du har ikke kilden, bare faktaarket.

- Bruk bare opplysningene i faktaarket. Ikke legg til fakta, tall, navn eller vurderinger fra egen kunnskap.
- Tall, navn og datoer skrives nøyaktig som i faktaarket. Påstander og vurderinger tilskrives den som står bak dem.
- Sitater bare ordrett fra faktaarket, i anførselstegn og med navn.
- Skriv med egne ord og naturlig avisspråk: korte setninger, aktiv form, ingen byråkratspråk.${medier ? '\n- Nevn aldri et medie, en avis eller en tv-kanal ved navn.' : ''}
- Første avsnitt forteller det viktigste. Ingen overskrift i body, ingen kildeliste og ingen lenker.
${LENGDE_REGEL}
${TITTEL_REGEL}

FAKTAARK:
${ark.fakta.map((f) => `- ${f}`).join('\n')}${ark.sitater.length ? `\n\nSITATER:\n${ark.sitater.map((s) => `- ${s.hvem}: «${s.sitat}»`).join('\n')}` : ''}`,
  });
  return svar?.body ? { ...sak, ...svar } : null;
}

// sjekk: çağıranın kesin kontrolleri (redaktörün sluttProblemer'i). Yeni metin hâlâ tetikteyse ya da kesin kontrolde
// eskisinden kötüyse null döner; çağıran eski taslakla devam eder (kapı ve kapıdaki yeniden yazma ağı yerinde).
export async function kildefriOmskriving(sak, kilde, { medier = false, sjekk = () => [] } = {}) {
  const foer = naerhet(helTekst(sak), kilde);
  let ny = null;
  try {
    const ark = await lagFaktaark(kilde, { medier });
    if (ark) ny = await skrivFraFaktaark(ark, sak, { medier });
  } catch (e) {
    if (e?.konfig) throw e; // anahtar/model ayarı bozuksa sessizce geçilmez
    console.warn(`  faktaark feilet: ${String(e?.message ?? e).slice(0, 200)}`);
  }
  if (!ny) return null;
  const etter = naerhet(helTekst(ny), kilde);
  if (etter.tetik || sjekk(ny).length > sjekk(sak).length) return null;
  return { sak: ny, oranFoer: foer.oran, oranEtter: etter.oran };
}

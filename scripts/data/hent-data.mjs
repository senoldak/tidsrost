// Sürekli güncel veri sayfalarının verisini resmi, anahtarsız açık API'lerden çeker ve src/data/*.json'a yazar.
//   - Styringsrenten: Norges Bank SDMX API (data.norges-bank.no), lisans NLOD.
//   - Prisstigning, boligpriser, arbeidsledighet: SSB PxWebApi v2 (tablo 14700, 07221, 13760), lisans NLOD.
//   - Farevarsler: MET Norway MetAlerts 2.0 (api.met.no), lisans CC BY 4.0. MET'in kullanım şartı gereği istekte
//     siteyi ve iletişim adresini tanıtan bir User-Agent gönderilir; Nyhetsbot ile ~2 saatte bir, tek istek.
// Bir kaynak başarısız olursa o dosyaya dokunulmaz: sayfa son bilinen değeri ve alındığı zamanı göstermeye devam eder.
// Faiz ya da turuncu/kırmızı uyarı değiştiyse GITHUB_OUTPUT'a "endret=1" yazar; iş akışı siteyi yeniden derletir.
// Yalnız sarı uyarılar değiştiyse dosya yine yazılır, siteye bir sonraki gerçek yayınla çıkar (hasterPublisering).
// Kullanım: node scripts/data/hent-data.mjs
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acilDurdurma } from '../nyheter/kapi.mjs';
import { RENTE_KILDE, VARSEL_KILDE, farevarsler, hasterPublisering, lesSdmxCsv, sammeInnhold, styringsrente } from './data.mjs';
import { SSB_KILDE, ssbUrl } from './ssb.mjs';
import { arbeidsledighet, boligpriser, prisstigning } from './ssb-sider.mjs';

// Standartlar: acil durdurma açıksa veri sayfaları da güncellenmez.
if (await acilDurdurma()) process.exit(0);

const ROT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROT, 'src/data');
const USER_AGENT = 'tidsrost.com/1.0 (+https://tidsrost.com/om-oss/; redaksjon@tidsrost.com)';

async function hent(url, accept) {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: accept }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.text();
}

const lesJson = async (fil) => {
  try {
    return JSON.parse(await readFile(fil, 'utf8'));
  } catch {
    return null;
  }
};

// Son 10 yılın günlük serisi: güncel düzeyin başladığı gün ve son değişiklikler için yeterli.
function renteUrl(naa = new Date()) {
  const fra = `${naa.getUTCFullYear() - 10}-01-01`;
  return `https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?startPeriod=${fra}&format=csv&locale=en`;
}

const JOBBER = [
  {
    fil: 'styringsrente.json',
    async lag() {
      const serie = lesSdmxCsv(await hent(renteUrl(), 'text/csv'));
      return { kilde: RENTE_KILDE, ...styringsrente(serie) };
    },
  },
  {
    fil: 'farevarsler.json',
    async lag() {
      const json = JSON.parse(await hent('https://api.met.no/weatherapi/metalerts/2.0/current.json', 'application/json'));
      return { kilde: VARSEL_KILDE, sistEndretHosMet: json.lastChange ?? null, varsler: farevarsler(json) };
    },
  },
  {
    fil: 'prisstigning.json',
    async lag() {
      const grupper = ['00', '01', '01.1', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13'];
      const url = ssbUrl('14700', { VareTjenesteGrp: grupper, ContentsCode: ['Tolvmanedersendring', 'KpiVektMnd'], Tid: 'top(24)' });
      return { kilde: SSB_KILDE, tabell: '14700', ...prisstigning(JSON.parse(await hent(url, 'application/json'))) };
    },
  },
  {
    fil: 'boligpriser.json',
    async lag() {
      const url = ssbUrl('07221', { Region: '*', Boligtype: '00', ContentsCode: 'Boligindeks', Tid: 'top(13)' });
      return { kilde: SSB_KILDE, tabell: '07221', ...boligpriser(JSON.parse(await hent(url, 'application/json'))) };
    },
  },
  {
    fil: 'arbeidsledighet.json',
    async lag() {
      const url = ssbUrl('13760', { Kjonn: ['0', '1', '2'], Alder: ['15-74', '15-24', '25-74'], Justering: 'S', ContentsCode: 'ArbledProsArbstyrk', Tid: 'top(24)' });
      return { kilde: SSB_KILDE, tabell: '13760', ...arbeidsledighet(JSON.parse(await hent(url, 'application/json'))) };
    },
  },
];

await mkdir(DIR, { recursive: true });
let endret = false;
for (const jobb of JOBBER) {
  const fil = path.join(DIR, jobb.fil);
  try {
    const ny = { hentet: new Date().toISOString(), ...(await jobb.lag()) };
    const gammel = await lesJson(fil);
    const ulik = !sammeInnhold(gammel, ny);
    await writeFile(fil, JSON.stringify(ny, null, 2) + '\n', 'utf8');
    const haster = hasterPublisering(jobb.fil, gammel, ny);
    if (haster) endret = true;
    console.log(
      `${jobb.fil}: ${!ulik ? 'uendret innhold, tidspunkt oppdatert' : haster ? 'oppdatert (nytt innhold)' : jobb.fil === 'farevarsler.json' ? 'oppdatert (bare gule varsler, venter på neste publisering)' : 'oppdatert (venter på neste publisering)'}`,
    );
  } catch (e) {
    // Eski dosya kalır; veri uydurulmaz.
    console.error(`${jobb.fil}: FEIL ${e.message}. Beholder siste kjente data.`);
  }
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `endret=${endret ? 1 : 0}\n`);

// Sürekli güncel veri sayfalarının verisini resmi, anahtarsız açık API'lerden çeker ve src/data/*.json'a yazar.
//   - Styringsrenten: Norges Bank SDMX API (data.norges-bank.no), lisans NLOD.
//   - Farevarsler: MET Norway MetAlerts 2.0 (api.met.no), lisans CC BY 4.0. MET'in kullanım şartı gereği istekte
//     siteyi ve iletişim adresini tanıtan bir User-Agent gönderilir; Nyhetsbot ile ~2 saatte bir, tek istek.
// Bir kaynak başarısız olursa o dosyaya dokunulmaz: sayfa son bilinen değeri ve alındığı zamanı göstermeye devam eder.
// İçerik (alma zamanı hariç) değiştiyse GITHUB_OUTPUT'a "endret=1" yazar; iş akışı siteyi yeniden derletir.
// Kullanım: node scripts/data/hent-data.mjs
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RENTE_KILDE, VARSEL_KILDE, farevarsler, lesSdmxCsv, sammeInnhold, styringsrente } from './data.mjs';

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
    if (ulik) endret = true;
    console.log(`${jobb.fil}: ${ulik ? 'oppdatert (nytt innhold)' : 'uendret innhold, tidspunkt oppdatert'}`);
  } catch (e) {
    // Eski dosya kalır; veri uydurulmaz.
    console.error(`${jobb.fil}: FEIL ${e.message}. Beholder siste kjente data.`);
  }
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `endret=${endret ? 1 : 0}\n`);

// Navnesøkets indeks (src/components/data/Navnesok.astro): { n: navn, k: 'J'|'G'|'E', a: antall, s?: side }.
// Lages ved bygging fra src/data/navn.json; ingen side (filtreres bort fra områdekartet på .json).
import data from '../../data/navn.json';
import { navnSider } from '../../../scripts/data/ssb-navn.mjs';

export async function GET() {
  const sider = new Map(navnSider(data).map((s) => [`${s.kjonn}${s.navn}`, s.slug]));
  const poster = [
    ...data.fornavn.map((n) => ({ n: n.navn, k: n.kjonn, a: n.antall, ...(sider.has(`${n.kjonn}${n.navn}`) ? { s: sider.get(`${n.kjonn}${n.navn}`) } : {}) })),
    ...data.etternavn.map((n) => ({ n: n.navn, k: 'E', a: n.antall })),
  ];
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

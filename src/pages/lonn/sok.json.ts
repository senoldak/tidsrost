// Yrkessøkets indeks (src/components/data/Lonnsok.astro): { n: navn, a: median, h: heltidsekvivalenter, s?: side }.
// Lages ved bygging fra src/data/lonn.json; ingen side (filtreres bort fra områdekartet på .json).
import data from '../../data/lonn.json';
import { lonnSider } from '../../../scripts/data/ssb-lonn.mjs';

export async function GET() {
  const sider = new Map(lonnSider(data).map((s) => [s.kode, s.slug]));
  const poster = data.yrker
    .filter((y) => /^\d{4}$/.test(y.kode))
    .map((y) => ({ n: y.navn, a: y.median, h: y.heltidsekv, ...(sider.has(y.kode) ? { s: sider.get(y.kode) } : {}) }));
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

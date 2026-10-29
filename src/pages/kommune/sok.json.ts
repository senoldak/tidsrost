// Kommunesøkets indeks (src/components/data/Kommunesok.astro): { n: navn, f: fylke, p: folketall, s: side }.
// Lages ved bygging fra src/data/kommuner.json; ingen side (filtreres bort fra områdekartet på .json).
import data from '../../data/kommuner.json';
import { kommuneSider } from '../../../scripts/data/ssb-kommune.mjs';

export async function GET() {
  const fylker = data.fylker as Record<string, { navn: string }>;
  const slugFor = new Map(kommuneSider(data).map((s) => [s.kode, s.slug]));
  const poster = data.kommuner.map((k) => ({ n: k.navn, f: fylker[k.fylke].navn, p: k.folkemengde, s: slugFor.get(k.kode) }));
  return new Response(JSON.stringify(poster), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}

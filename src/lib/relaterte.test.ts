import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relaterteSaker, erSammendrag, kanRelateres, type Anlam } from './relaterte.ts';
import type { Haber } from './news.ts';

// Gövde: dizine girecek uzunlukta (MIN_ORD_INDEKS) nötr metin, her haberde farklı (küçük kümede ortak dolgu kelimeleri
// ortaklık sayılmasın); ortaklık başlıktan ve ek metinden gelir.
const fyll = (id: string) => Array.from({ length: 130 }, (_, i) => `${id}x${i}`).join(' ');
const h = (id: string, category: string, title: string, ek = '', body = `${ek} ${fyll(id)}`): Haber =>
  ({ id, body, data: { title, description: '', category } }) as unknown as Haber;

// Gemini Faz 2 sınaması: anlam yokken çağrının ürettiği sıra (sahte anlam her zaman null).
const anlamsiz: Anlam = () => null;
const ider = (m: Map<string, Haber[]>, id: string) => (m.get(id) ?? []).map((x) => x.id);

test('Kort fortalt ve bültenler özet sayılır, kısa haber ilgili listesine girmez', () => {
  assert.equal(erSammendrag(h('kort-fortalt-2026-10-27', 'innenriks', 'Kort fortalt')), true);
  assert.equal(erSammendrag(h('morgenbulletin-27', 'innenriks', 'Bulletin')), true);
  assert.equal(kanRelateres(h('kort', 'innenriks', 'Kort sak', '', 'for kort')), false);
  assert.equal(kanRelateres(h('lang', 'innenriks', 'Lang sak')), true);
});

test('ortak kurum ve özel isim puanı yeten haber önce; yoksa aynı kategorinin en yenisi', () => {
  const ana = h('ana', 'innenriks', 'Stortinget vedtok Solberg-forslaget', 'Stortinget Solberg Halvorsen');
  const news = [
    ana,
    h('ortak', 'okonomi', 'Solberg møtte Stortinget igjen', 'Stortinget Solberg Halvorsen'),
    h('kat1', 'innenriks', 'Ny vei åpnet i nord'),
    h('kat2', 'innenriks', 'Skole stengt etter brann'),
    h('annen', 'sport', 'Fotballkamp avlyst'),
  ];
  const r = ider(relaterteSaker(news, 3, anlamsiz), 'ana');
  assert.equal(r[0], 'ortak');
  assert.deepEqual(r.slice(1), ['kat1', 'kat2']);
  assert.ok(!r.includes('ana'));
});

test('anlam yoksa sıra bugünkü (varsayılan) çağrıyla birebir', () => {
  const news = [
    h('a', 'innenriks', 'Stortinget vedtok budsjettet', 'Stortinget Halvorsen'),
    h('b', 'innenriks', 'Halvorsen kommenterte Stortinget', 'Stortinget Halvorsen'),
    h('c', 'utenriks', 'Valg i Sverige'),
    h('d', 'innenriks', 'Ny vei åpnet'),
  ];
  const once = relaterteSaker(news, 4, anlamsiz);
  const varsayilan = relaterteSaker(news, 4);
  for (const x of news) assert.deepEqual(ider(once, x.id), ider(varsayilan, x.id));
});

test('anlamca çok yakın haber ortak terimi ve kategorisi olmasa da listeye girer', () => {
  const ana = h('ana', 'innenriks', 'Strømprisen steg kraftig i oktober');
  const news = [ana, h('yakin', 'okonomi', 'Kraftregningen blir dyrere denne høsten'), h('kat', 'innenriks', 'Ny vei åpnet')];
  const anlam: Anlam = (a, b) => (a.id === 'ana' && b.id === 'yakin' ? 0.97 : null);
  assert.deepEqual(ider(relaterteSaker(news, 1, anlam), 'ana'), ['yakin']);
  assert.deepEqual(ider(relaterteSaker(news, 1, anlamsiz), 'ana'), ['kat']);
});

test('anlam özeti ve kısa haberi listeye sokmaz; düşük benzerlik etkisiz', () => {
  const ana = h('ana', 'innenriks', 'Strømprisen steg kraftig');
  const news = [ana, h('kort-fortalt-1', 'innenriks', 'Kort fortalt'), h('kisa', 'innenriks', 'Kort', '', 'for kort'), h('kat', 'innenriks', 'Ny vei åpnet')];
  const yuksek: Anlam = (_a, b) => (b.id === 'kat' ? null : 0.99);
  assert.deepEqual(ider(relaterteSaker(news, 4, yuksek), 'ana'), ['kat']);
  const dusuk: Anlam = () => 0.5;
  for (const x of news) assert.deepEqual(ider(relaterteSaker(news, 4, dusuk), x.id), ider(relaterteSaker(news, 4, anlamsiz), x.id));
});

test('orta benzerlik (0,7) tek başına eşiğe ulaşmaz, ortak terimle birlikte öne alır', () => {
  const ana = h('ana', 'innenriks', 'Strømprisen steg kraftig i oktober');
  const news = [ana, h('orta', 'okonomi', 'Kraftregningen blir dyrere'), h('kat', 'innenriks', 'Ny vei åpnet')];
  const anlam: Anlam = (a, b) => (a.id === 'ana' && b.id === 'orta' ? 0.7 : null);
  assert.deepEqual(ider(relaterteSaker(news, 1, anlam), 'ana'), ['kat']);
});

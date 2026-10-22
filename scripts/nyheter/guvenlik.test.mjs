import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normaliserUrl, mdKacir, skrivSak, lesRss } from './lib.mjs';
import { kortMelding, linje } from './kortfortalt.mjs';
import { sjekkMedier, vurderOgVask } from './redaktor.mjs';

test('normaliserUrl: https kreves, tegn som bryter lenker kodes', () => {
  assert.equal(normaliserUrl('http://a.no/x'), null);
  assert.equal(normaliserUrl('javascript:alert(1)'), null);
  assert.equal(normaliserUrl('ikke en url'), null);
  assert.equal(normaliserUrl('https://user:pw@a.no/x'), null);
  const u = normaliserUrl('https://a.no/p ath"<b>)(x)\'`?q=a b&r=[1]');
  assert.match(u, /^https:\/\/a\.no\//);
  assert.doesNotMatch(u, /[\s"'<>()`[\]]/);
});

test('RSS-lenke med &quot; og parenteser kan ikke bryte ut av Kilde-linjen', async () => {
  const xml = '<rss><channel><item><title>T</title><link>https://a.no/x?a=1&amp;b=%22) [pwn](https://ond.example/</link></item></channel></rss>';
  const [item] = lesRss(xml);
  const rot = await mkdtemp(path.join(os.tmpdir(), 'sik-'));
  await mkdir(path.join(rot, 'public'), { recursive: true });
  const slug = await skrivSak(rot, {
    title: 'Tittel her', description: 'Beskrivelse her.', body: 'Tekst.', date: '2026-10-18T10:00:00+02:00', category: 'innenriks',
    produksjon: 'automatisk', kilde: { navn: 'Dep [x](https://ond.example)', url: item.link },
  });
  const md = await readFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), 'utf8');
  const kilde = md.split('\n').find((l) => l.startsWith('*Kilde'));
  assert.equal((kilde.match(/\]\(/g) ?? []).length, 1, kilde);
  assert.match(kilde, /\]\(https:\/\/a\.no\/[^\s()"<>]*\)\*$/);
  await assert.rejects(skrivSak(rot, { title: 'T', description: 'D', body: 'B', date: '2026-10-18', category: 'innenriks', kilde: { navn: 'X', url: 'http://a.no' } }));
});

test('Kort fortalt: kilde-URL normaliseres', () => {
  const m = kortMelding({ tittel: 'Sak', ingress: 'Ingress.', kilde: { navn: 'A]', url: 'https://a.no/x)y z' } });
  assert.doesNotMatch(m.kilde.url, /[\s()]/);
  assert.equal((linje(m).match(/\]\(/g) ?? []).length, 1);
  assert.equal(kortMelding({ tittel: 'Sak', ingress: 'I', kilde: { navn: 'A', url: 'https://' } }), null);
});

test('Medienavn i why_matters og key_points fanges av vurderOgVask()', async () => {
  assert.ok(sjekkMedier('Dette melder NRK.').length);
  const sak = { title: 'Ren tittel', description: 'Ren ingress.', body: 'Ren tekst.', why_matters: 'Ifølge NRK er saken viktig.', key_points: ['Rent punkt', 'Avisa Nettavisen skriver det'] };
  const r = await vurderOgVask(sak, 'Kilde.', { medier: true }).catch((e) => e);
  const tekst = JSON.stringify(r instanceof Error ? r.message : r);
  assert.match(tekst, /NRK|Nettavisen|Medier nevnt/);
});

test('mdKacir: Markdown og HTML i tredjepartstittel nøytraliseres', () => {
  const s = mdKacir('Slik [lenke](https://ond.example) <img src=x> `kode`\nny linje');
  assert.doesNotMatch(s, /\n/);
  assert.doesNotMatch(s, /(^|[^\\])[[\]()<>`]/);
});

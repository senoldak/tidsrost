import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sammeHendelse, finnDublett, lesHukommelse, nokkel, termer, ikkeNyhet } from './dublett.mjs';

// Gerçek mükerrer çiftler (aynı gün iki ayrı çalışmada yazıldılar).
const botA = {
  tittel: 'Datatilsynet gir Microsoft-selskap 92 millioner i bot',
  ingress: 'Ifølge Datatilsynet har annonsetjenesten Xandr behandlet og delt sensitive personopplysninger i strid med personvernregelverket.',
};
const botB = {
  tittel: 'Microsoft-selskap ilagt bot på 92 millioner etter klage',
  ingress: 'Datatilsynet har ilagt Microsoft-selskapet Xandr et gebyr på 92 millioner kroner etter en klage fra Forbrukerrådet.',
};
// Gerçek …-a3 / …-a3-2 çifti: aynı başlık, farklı geçerlilik süresi (ardışık iki ayrı uyarı).
const P1 = 'Varselet gjelder fra torsdag 15. oktober kl. 21.00 til fredag 16. oktober kl. 00.00.';
const P2 = 'Varselet gjelder fra fredag 16. oktober kl. 18.00 til lørdag 17. oktober kl. 00.00.';
const ising = (sone, gjelder = P1) => ({
  tittel: `Oransje farevarsel for sterk ising på skip i ${sone}`,
  ingress: 'Utrygt for sterk ising.',
  tekst: `Utrygt.\n\n${gjelder}\n`,
  produksjon: 'automatisk',
});

test('termer: gövdeleme ve rakamlar', () => {
  const t = termer('Norge og Polen signerer / signerte partnerskap for 8,5 millioner');
  assert.ok(t.has('signer'));
  assert.ok(t.has('8.5'));
  assert.ok(!t.has('og'));
});

test('samme bot omtalt med ulik tittel er samme hendelse', () => {
  assert.equal(sammeHendelse(botA, botB), true);
  assert.equal(sammeHendelse(botB, botA), true);
});

test('samme farevarsel sendt ut på nytt (samme tittel og periode eller kilde-id) er samme hendelse', () => {
  assert.equal(sammeHendelse(ising('A3'), ising('A3')), true);
  assert.equal(sammeHendelse(ising('A3'), ising('A3'), { strengt: true }), true);
  assert.equal(sammeHendelse({ ...ising('A3'), kildeId: 'met:x1' }, { ...ising('A3', P2), kildeId: 'met:x1' }, { strengt: true }), true);
});

test('oppfølgende farevarsel med ny periode (…-a3 / …-a3-2) slippes gjennom', () => {
  assert.equal(sammeHendelse(ising('A3', P1), ising('A3', P2)), false);
  assert.equal(sammeHendelse(ising('A3', P1), ising('A3', P2), { strengt: true }), false);
  assert.equal(sammeHendelse({ ...ising('A3'), kildeId: 'met:x1' }, { ...ising('A3'), kildeId: 'met:x2' }, { strengt: true }), false);
});

test('farevarsel for et annet havområde er ikke samme hendelse', () => {
  assert.equal(sammeHendelse(ising('A2'), ising('A3')), false);
  assert.equal(sammeHendelse(ising('B2'), ising('A3'), { strengt: true }), false);
});

test('datasaker sammenlignes bare på tittel', () => {
  const a = { tittel: 'Gult farevarsel for kraftige vindkast i deler av Finnmark og Nord-Troms', ingress: 'Meteorologisk institutt varsler kraftige vindkast.', produksjon: 'automatisk' };
  const b = { tittel: 'Gult farevarsel for kraftige vindkast i deler av Vest-Finnmark og Nord-Troms', ingress: 'Meteorologisk institutt varsler kraftige vindkast.', produksjon: 'automatisk' };
  assert.equal(sammeHendelse(a, b), false);
});

test('samme tema, ulike hendelser, er ikke samme hendelse', () => {
  const angrep1 = { tittel: 'Innbyggere drept og dusinvis skadet i angrep på Kharkiv og Kyiv', ingress: 'Angrep på Ukrainas to største byer har drept sivile, opplyser FN.' };
  const angrep2 = { tittel: 'To drept i angrep mot boligblokk i Kyiv', ingress: 'To personer er drept i et angrep mot en boligblokk i Ukrainas hovedstad.' };
  assert.equal(sammeHendelse(angrep1, angrep2), false);
  const kamp1 = { tittel: 'Viking møter Bayern München i historisk kamp', ingress: 'Viking spiller mot Bayern München i Stavanger.' };
  const kamp2 = { tittel: 'Viking ryster Bayern München med tomålsledelse til pause', ingress: 'Viking leder 2–0 mot Bayern München.' };
  assert.equal(sammeHendelse(kamp1, kamp2), false);
});

test('ulike beløp i tittelen er ulike hendelser', () => {
  const a = { tittel: 'Norge gir 150 millioner til glemte kriser', ingress: 'Utenriksdepartementet opplyser at Norge gir penger.' };
  const b = { tittel: 'Norge gir 750 millioner til Ukraina', ingress: 'Utenriksdepartementet opplyser at Norge gir penger.' };
  assert.equal(sammeHendelse(a, b), false);
});

test('hukommelsen leser publiserte saker fra de siste 72 timene og hopper over utkast', async () => {
  const rot = await mkdtemp(path.join(tmpdir(), 'dublett-'));
  try {
    const naa = Date.parse('2026-10-14T18:00:00+02:00');
    const skriv = async (slug, felt, gjelder = P1) => {
      await mkdir(path.join(rot, 'src/content/haberler', slug), { recursive: true });
      const fm = Object.entries(felt).map(([k, v]) => `${k}: ${typeof v === 'string' && k !== 'date' ? JSON.stringify(v) : v}`).join('\n');
      await writeFile(path.join(rot, 'src/content/haberler', slug, 'index.md'), `---\n${fm}\n---\n\nTekst.\n\n${gjelder}\n`);
    };
    await skriv('datatilsynet-gir-microsoft-selskap-92-millioner-i-bot', { title: botA.tittel, description: botA.ingress, date: '2026-10-12T08:05:28+02:00', produksjon: 'ki-kontrollert' });
    await skriv('oransje-farevarsel-for-sterk-ising-pa-skip-i-a3', { title: ising('A3').tittel, description: 'Utrygt for sterk ising.', date: '2026-10-14T12:01:14+02:00', produksjon: 'automatisk' });
    await skriv('gammel-sak', { title: 'Oransje farevarsel for sterk ising på skip i B1', description: 'Utrygt.', date: '2026-10-01T12:00:00+02:00', produksjon: 'automatisk' });
    await skriv('utkast', { title: 'Oransje farevarsel for sterk ising på skip i B2', description: 'Utrygt.', date: '2026-10-15T10:00:00+02:00', produksjon: 'automatisk', draft: true });

    const h = await lesHukommelse(rot, { naa });
    assert.deepEqual(h.map((s) => s.slug).sort(), ['datatilsynet-gir-microsoft-selskap-92-millioner-i-bot', 'oransje-farevarsel-for-sterk-ising-pa-skip-i-a3']);

    assert.equal(finnDublett(h, botB)?.slug, 'datatilsynet-gir-microsoft-selskap-92-millioner-i-bot');
    assert.equal(finnDublett(h, ising('A3'), { strengt: true })?.slug, 'oransje-farevarsel-for-sterk-ising-pa-skip-i-a3');
    // Aynı bölge, sonraki dönem: yeni uyarı yayınlanır.
    assert.equal(finnDublett(h, ising('A3', P2), { strengt: true }), undefined);
    assert.equal(finnDublett(h, ising('A2'), { strengt: true }), undefined);
    // Eski (72 saatten önce) ve taslak haberler hafızada yok.
    assert.equal(finnDublett(h, ising('B1'), { strengt: true }), undefined);
    assert.equal(finnDublett(h, ising('B2'), { strengt: true }), undefined);

    // Aynı çalışmada yazılan haber hafızaya eklenince sonraki aday yakalanır.
    h.push(nokkel({ slug: 'ny', tittel: ising('B2').tittel, ingress: 'Utrygt.', tekst: P1, tid: naa, produksjon: 'automatisk' }));
    assert.equal(finnDublett(h, ising('B2'), { strengt: true })?.slug, 'ny');
  } finally {
    await rm(rot, { recursive: true, force: true });
  }
});

// Canlı denetimde bulunan çiftler (20 Ekim 2026): farklı başlık ve giriş, aynı olay.
test('kısa başlık uzun başlığın alt kümesi: aynı kurumun aynı olayı', () => {
  const a = { tittel: 'Europakommisjonen legger fram ny europeisk strategi', ingress: 'Europakommisjonen har vedtatt en ny europeisk strategi for å møte endrede sikkerhetsforhold.' };
  const b = { tittel: 'Europakommisjonen legger fram ny strategi', ingress: 'Europakommisjonen og høyrepresentanten har presentert en ny strategi som fokuserer på sikkerhet og klima.' };
  assert.equal(sammeHendelse(a, b), true);
  // ayırt edici terimsiz kısa başlık alt kümesi sayılmaz
  assert.equal(sammeHendelse({ tittel: 'Ny bil funnet drept', ingress: 'a' }, { tittel: 'Ny bil funnet drept etter angrep', ingress: 'b' }), false);
});

const lead = (txt) => `${txt}\n\nAndre avsnitt.`;
const oslo = (tittel, ingress, tekst, tid) => ({ tittel, ingress, tekst: lead(tekst), tid, slug: tittel });
const NAA = Date.parse('2026-10-20T15:00:00Z');
const olsoTekst = 'Ukrainas president Volodymyr Zelenskyj møter statsminister Jonas Gahr Støre og Finlands president Alexander Stubb i Oslo. De amerikanske utsendingene Steve Witkoff og Jared Kushner deltar.';

test('nadir ortak özel isimler: aynı olayın farklı anlatımı yakalanır', () => {
  const minne = [
    nokkel(oslo('Volodymyr Zelenskyj besøker Oslo', 'Samtaler tirsdag.', olsoTekst, NAA - 5 * 36e5)),
    nokkel(oslo('Hungersnød i Sudan', 'FN advarer.', 'FN-sjefen Antonio Guterres advarer mot hungersnød i Sudan.', NAA - 4 * 36e5)),
  ];
  const ny = { tittel: 'Toppmøte om Ukraina i Norge', ingress: 'Zelenskyj har landet.', tekst: lead(olsoTekst) };
  assert.equal(finnDublett(minne, ny, { naa: NAA })?.slug, 'Volodymyr Zelenskyj besøker Oslo');
  // 48 saatten eski hafıza sayılmaz
  const eski = [nokkel(oslo('Volodymyr Zelenskyj besøker Oslo', 'Samtaler tirsdag.', olsoTekst, NAA - 60 * 36e5))];
  assert.equal(finnDublett(eski, ny, { naa: NAA }), undefined);
  // yalnız sık isimler (Zelenskyj, Ukraina, Trump...) paylaşılıyorsa farklı olay
  const baska = { tittel: 'Zelenskyj kritiserer Trump', ingress: 'Krigen i Ukraina.', tekst: lead('Zelenskyj kritiserer Donald Trump og USA for Ukraina-politikken i Russland-krigen.') };
  assert.equal(finnDublett(minne, baska, { naa: NAA }), undefined);
});

test('sjangre som ikke er nyheter (forklart, analyse) holdes utenfor dublettsøket', () => {
  assert.equal(ikkeNyhet('forklart'), true);
  assert.equal(ikkeNyhet('analyse'), true);
  assert.equal(ikkeNyhet(''), false);
  assert.equal(ikkeNyhet('nyhet'), false);
});

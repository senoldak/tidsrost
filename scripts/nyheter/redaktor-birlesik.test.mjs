import test from 'node:test';
import assert from 'node:assert/strict';

// Vaktsjefens dom og språkvasken er to atskilte KI-kall. Vasken som bryter kontrollene prøves én gang til og
// forkastes så synlig; språkporten før publisering stopper saker med sikre språkfeil.
process.env.GEMINI_API_KEY = 'test';
process.env.GEMINI_ARALIK_MS = '0';
process.env.GEMINI_BEKLE_CARPAN = '0';
// Taslaklar kaynağın aynısı; bu dosya onay zincirini sınar, faktaark adımı faktaark-rediger.test.mjs'te.
process.env.FAKTAARK = '0';
const { redigerSak, sprakPort } = await import('./redaktor.mjs');

const ledd = ['alle kommuner', 'større byer', 'små bygder', 'kystkommunene', 'fjellområdene', 'øysamfunnene', 'grensekommunene', 'dalførene', 'storbyregionene', 'distriktene', 'fylkene', 'havnebyene', 'kurstedene', 'industristedene', 'jordbruksbygdene', 'skogsbygdene', 'fiskeværene', 'tettstedene', 'bergverksbyene', 'universitetsbyene'];
const body = ledd.map((l) => `Regjeringen la fram forslaget onsdag og la vekt på at ordningen skal gjelde ${l} i landet fra neste år.`).join(' ');
const kilde = `${body}\n\nKilde.`;
const sak = { title: 'Regjeringen foreslår ny ordning for kommunene', description: 'Forslaget gjelder alle kommuner.', body };
const ingenOrdbok = async () => { throw new Error('ingen nett i test'); };

// svarFn(type, n, prompt): type = 'vurdering' | 'vask' | 'rett'
async function kjor(svarFn, saken = sak, kildeTekst = kilde) {
  const kall = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const prompt = JSON.parse(init.body).contents[0].parts[0].text;
    const type = prompt.startsWith('Du er vaktsjef') ? 'vurdering' : prompt.startsWith('Du er språkvasker') ? 'vask' : 'rett';
    kall.push({ type, prompt });
    const svar = svarFn(type, kall.filter((k) => k.type === type).length, prompt);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  const warn = console.warn;
  const logg = [];
  console.warn = (...a) => logg.push(a.join(' '));
  try {
    const r = await redigerSak(saken, kildeTekst, { hent: ingenOrdbok, korpus: new Set() });
    return { r, kall, logg };
  } finally {
    globalThis.fetch = gercek;
    console.warn = warn;
  }
}
const godkjent = () => ({ godkjent: true, problemer: [] });
const typer = (kall) => kall.map((k) => k.type).join(',');

test('godkjent sak: dom og språkvask er to separate kall; vasket tekst brukes', async () => {
  const { r, kall } = await kjor((type) => (type === 'vurdering' ? godkjent() : { ...sak, body: body.replace('la vekt på', 'understreket') }));
  assert.equal(typer(kall), 'vurdering,vask');
  assert.match(r.sak.body, /understreket/);
  assert.equal(r.stopp.length, 0);
});

test('vurderingen har ikke lenger omskriving i skjemaet; vasken har tenkning medium', async () => {
  const skjemaer = [];
  const gercek = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const b = JSON.parse(init.body);
    skjemaer.push({ props: Object.keys(b.generationConfig?.responseSchema?.properties ?? {}), temp: b.generationConfig?.temperature, tenk: b.generationConfig?.thinkingConfig?.thinkingLevel });
    const prompt = b.contents[0].parts[0].text;
    const svar = prompt.startsWith('Du er vaktsjef') ? godkjent() : sak;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(svar) }] } }], usageMetadata: {} }));
  };
  try {
    await redigerSak(sak, kilde, { hent: ingenOrdbok, korpus: new Set() });
  } finally {
    globalThis.fetch = gercek;
  }
  assert.ok(!skjemaer[0].props.includes('redigert'));
  assert.equal(skjemaer[1].temp, 0.2);
  assert.equal(skjemaer[1].tenk, 'medium');
});

test('vask som bryter lengderegelen: ett nytt forsøk, så forkastes den med synlig merknad og logg', async () => {
  const { r, kall, logg } = await kjor((type) => (type === 'vurdering' ? godkjent() : { ...sak, body: 'For kort.' }));
  assert.equal(typer(kall), 'vurdering,vask,vask');
  assert.match(kall[2].prompt, /FORRIGE FORSØK BLE FORKASTET/);
  assert.equal(r.sak.body, body);
  assert.equal(r.stopp.length, 0);
  assert.ok(r.merknader.some((m) => m.startsWith('Språkvask forkastet')));
  assert.ok(logg.some((l) => l.includes('Språkvask forkastet')));
});

test('vask med påfunnet tall: andre forsøk får vite hvilket tall, og godkjent andre forsøk brukes', async () => {
  const { r, kall } = await kjor((type, n) => {
    if (type === 'vurdering') return godkjent();
    return n === 1 ? { ...sak, body: `${body} Det gjelder 4 827 kommuner.` } : { ...sak, body: body.replace('la fram', 'presenterte') };
  });
  assert.equal(typer(kall), 'vurdering,vask,vask');
  assert.match(kall[2].prompt, /4 827/);
  assert.match(r.sak.body, /presenterte/);
  assert.equal(r.merknader.length, 0);
});

test('vask som endrer lengden for mye (over 115 prosent) forkastes', async () => {
  const { r } = await kjor((type) => (type === 'vurdering' ? godkjent() : { ...sak, body: `${body} ${body.split(' ').slice(0, 60).join(' ')}.` }));
  assert.equal(r.sak.body, body);
  assert.ok(r.merknader.some((m) => /Lengden endret seg/.test(m)));
});

test('avvist sak: rett, ny kontroll med vask', async () => {
  const { r, kall } = await kjor((type, n) => {
    if (type === 'vurdering') return n === 1 ? { godkjent: false, problemer: ['Feil i fakta'] } : godkjent();
    return sak;
  });
  assert.equal(typer(kall), 'vurdering,rett,vurdering,vask');
  assert.equal(r.sak.body, body);
  assert.deepEqual(r.merknader, ['Feil i fakta']);
});

test('språkporten: rettNb-rettelser slipper saken gjennom uten ekstra KI-kall', async () => {
  const tallBody = body.replace('landet fra neste år.', 'landet fra neste år, og ordningen berører 450.000 innbyggere.');
  const saken = { ...sak, body: tallBody };
  const { r, kall } = await kjor((type) => (type === 'vurdering' ? godkjent() : saken), saken, `${tallBody}\n\nKilde.`);
  assert.equal(typer(kall), 'vurdering,vask');
  assert.match(r.sak.body, /450 000 innbyggere/);
  assert.doesNotMatch(r.sak.body, /450\.000/);
  assert.equal(r.stopp.length, 0);
});

test('språkporten: sikker skrivefeil som vasken ikke retter stopper saken med språk:-årsak', async () => {
  const feilBody = body.replace('landet fra neste år.', 'landet fra neste år etter opppeturen i økonomien.');
  const saken = { ...sak, body: feilBody };
  const { r, kall, logg } = await kjor((type) => (type === 'vurdering' ? godkjent() : saken), saken, `${feilBody}\n\nKilde.`);
  assert.equal(typer(kall), 'vurdering,vask,vask'); // vask + én runde i språkporten
  assert.match(kall[2].prompt, /opppeturen/);
  assert.equal(r.stopp.length, 1);
  assert.match(r.stopp[0], /^språk: .*opppeturen/);
  assert.ok(logg.some((l) => l.includes('Språkporten stoppet')));
});

test('språkporten: vask i porten som fjerner feilen slipper saken gjennom', async () => {
  const feilBody = body.replace('landet fra neste år.', 'landet fra neste år etter opppeturen i økonomien.');
  const saken = { ...sak, body: feilBody };
  // Første vask (ordinær) lar feilen stå; neste (språkport) retter. Kilden inneholder det rettede ordet.
  const rettet = feilBody.replace('opppeturen', 'oppturen');
  const { r, kall } = await kjor((type, n) => (type === 'vurdering' ? godkjent() : n === 1 ? saken : { ...sak, body: rettet }), saken, `${feilBody}\n\n${rettet}\n\nKilde.`);
  assert.equal(typer(kall), 'vurdering,vask,vask');
  assert.equal(r.stopp.length, 0);
  assert.match(r.sak.body, /oppturen/);
});

test('sprakPort alene: rent tall rettes uten KI', async () => {
  const gercek = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('KI skal ikke kalles'); };
  try {
    const s = { ...sak, body: `${body} Prisen var 1.200 kroner.` };
    const r = await sprakPort(s, `${s.body}\n\nKilde.`, { hent: ingenOrdbok });
    assert.deepEqual(r.feil, []);
    assert.match(r.sak.body, /1 200 kroner/);
  } finally {
    globalThis.fetch = gercek;
  }
});

test('sprakPort: ingress lik første setning i brødteksten stopper ikke saken', async () => {
  const gercek = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('KI skal ikke kalles'); };
  try {
    const forste = body.split('. ')[0] + '.';
    const r = await sprakPort({ ...sak, description: forste }, kilde, { hent: ingenOrdbok });
    assert.deepEqual(r.feil, []);
  } finally {
    globalThis.fetch = gercek;
  }
});

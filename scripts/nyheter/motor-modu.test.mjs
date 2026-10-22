import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { motorTuru, turSec } from './motor-modu.mjs';
import { motorKimlik } from './motor.mjs';

mock.method(console, 'log', () => {});
mock.method(console, 'warn', () => {});

const SIMDI = new Date('2026-10-22T09:00:00Z');

// Sahte motor dizini: ağ yok. tur.mjs adayları alır, hepsini uyarlayıcıya verir (ya da fırlatır).
async function sahteMotor({ tur } = {}) {
  const dizin = await mkdtemp(path.join(tmpdir(), 'motor-'));
  await mkdir(path.join(dizin, 'ortak'));
  await writeFile(
    path.join(dizin, 'tur.mjs'),
    tur ??
      `export async function turCalistir(p) {
  globalThis.__tur = p;
  const a = await p.uyarlayici.adaylar({ simdi: p.simdi, log: p.log });
  const sonuclar = await p.uyarlayici.isle(a, { surVar: p.surVar, log: p.log });
  return { yazilan: sonuclar.filter((s) => s.durum === 'yazildi').map((s) => s.slug), elenen: 0, bekleyen: 0, hatalar: [] };
}\n`,
  );
  await writeFile(path.join(dizin, 'defter.mjs'), `export const defterIstemcisi = (p) => ({ sahte: 'defter', ...p });\n`);
  await writeFile(path.join(dizin, 'ortak/gizli.mjs'), `export const gizliKur = (p) => ({ sahte: 'gizli', ...p });\n`);
  return dizin;
}

const env = (dizin) => ({ MOTOR_TUR: '1', MOTOR_DIZIN: dizin, MOTOR_URL: 'https://saat.example.com', MOTOR_ANAHTARI: 'x' });
const sahteUyarlayici = (isle, adaylar) => ({ adaylar: async () => adaylar, isle, ozet: {}, simdi: SIMDI });
const temizle = (dizin) => rm(dizin, { recursive: true, force: true });

test('MOTOR_TUR yokken yerelTur çağrılır', async () => {
  const cagrilar = [];
  const sonuc = await turSec({
    env: {},
    uyarlayici: {},
    durum: {},
    yerel: async (u, d) => cagrilar.push(['yerel', u, d]),
    motor: async () => cagrilar.push(['motor']),
  });
  assert.equal(cagrilar.length, 1);
  assert.equal(cagrilar[0][0], 'yerel');
  assert.ok(sonuc);
});

test('MOTOR_TUR=1 ve MOTOR_DIZIN yokken hata: MOTOR_DIZIN, yerel tura düşmez', async () => {
  const yerel = mock.fn();
  await assert.rejects(turSec({ env: { MOTOR_TUR: '1' }, uyarlayici: {}, durum: {}, yerel, motor: (p) => motorTuru(p) }), /MOTOR_DIZIN/);
  assert.equal(yerel.mock.callCount(), 0);
});

test('MOTOR_TUR=1 ve motor import edilemezse hata ile biter, yerel tura düşmez', async () => {
  const dizin = await mkdtemp(path.join(tmpdir(), 'motor-bos-'));
  try {
    const yerel = mock.fn();
    await assert.rejects(turSec({ env: env(dizin), uyarlayici: {}, durum: { sett: {} }, yerel, motor: (p) => motorTuru({ ...p, rot: '.' }) }), /motor/i);
    assert.equal(yerel.mock.callCount(), 0);
  } finally {
    await temizle(dizin);
  }
});

test('motorTuru: ayar, gizli ve defter sözleşme değerleriyle kurulur', async () => {
  const dizin = await sahteMotor();
  try {
    const sonuc = await motorTuru({ motorDizin: dizin, uyarlayici: sahteUyarlayici(async () => [], []), durum: { sett: {} }, env: env(dizin), simdi: SIMDI, rot: '/kok' });
    const p = globalThis.__tur;
    assert.deepEqual(p.ayar, { ad: 'tidsrost', site: 'https://tidsrost.com', yaziYolu: '/artikkel/{slug}/', bekleyenLimit: 50 });
    assert.equal(p.site, 'tidsrost');
    assert.deepEqual(p.geminiKur(), { sayac: { cagri: 0, giris: 0, cikis: 0 } });
    assert.equal(p.defter.url, 'https://saat.example.com');
    assert.equal(p.defter.site, 'tidsrost');
    assert.equal(p.defter.anahtar, 'x');
    assert.equal(p.gizli.anahtarAdi, 'KILDE_NOKKEL');
    assert.equal(p.gizli.sifreliDosya, 'scripts/nyheter/kilder/hemmelige-kilder.kryptert');
    assert.equal(p.gizli.kokDizin, '/kok');
    assert.deepEqual(sonuc.yazilan, []);
  } finally {
    await temizle(dizin);
  }
});

test("motor modunda karar verilen üyeler sett'e işaretlenir; bekleyen hatalı üye işaretlenmez", async () => {
  const dizin = await sahteMotor();
  try {
    const durum = { sett: {} };
    const girdi = ['a', 'b', 'c'].map((id) => ({ kimlik: motorKimlik(`bir:${id}`), yuk: { id: `bir:${id}` }, baslik: id }));
    const [a, b, c] = girdi;
    const uyarlayici = sahteUyarlayici(
      async () => [
        { kimlik: a.kimlik, durum: 'yazildi', slug: 's1' },
        { kimlik: b.kimlik, durum: 'elendi', gerekce: 'kapsam dışı' },
        { kimlik: c.kimlik, durum: 'bekliyor', hata: new Error('geçici') },
      ],
      girdi,
    );
    const sonuc = await motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' });
    assert.deepEqual(sonuc.yazilan, ['s1']);
    assert.deepEqual(Object.keys(durum.sett).sort(), ['bir:a', 'bir:b']);
    assert.equal(durum.sett['bir:a'], SIMDI.toISOString());
  } finally {
    await temizle(dizin);
  }
});

test("motor turu fırlatırsa kısmi sonuçlar sett'e işlenir ve hata yeniden fırlatılır", async () => {
  const dizin = await sahteMotor({
    tur: `export async function turCalistir(p) {
  const a = await p.uyarlayici.adaylar({});
  await p.uyarlayici.isle(a, {});
}\n`,
  });
  try {
    const durum = { sett: {} };
    const a = { kimlik: motorKimlik('bir:a'), yuk: { id: 'bir:a' }, baslik: 'a' };
    const hata = Object.assign(new Error('ayar'), { ayar: true, sonuclar: [{ kimlik: a.kimlik, durum: 'yazildi', slug: 's1' }] });
    const uyarlayici = sahteUyarlayici(async () => {
      throw hata;
    }, [a]);
    await assert.rejects(motorTuru({ motorDizin: dizin, uyarlayici, durum, env: env(dizin), simdi: SIMDI, rot: '.' }), (e) => e === hata);
    assert.ok(durum.sett['bir:a']);
  } finally {
    await temizle(dizin);
  }
});

test('motorTuru: surVar motora iletilir', async () => {
  const dizin = await sahteMotor();
  try {
    const surVar = () => false;
    await motorTuru({ motorDizin: dizin, uyarlayici: sahteUyarlayici(async () => [], []), durum: { sett: {} }, env: env(dizin), simdi: SIMDI, rot: '.', surVar });
    assert.equal(globalThis.__tur.surVar, surVar);
  } finally {
    await temizle(dizin);
  }
});

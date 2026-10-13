import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { yazi, sigdir, sakKapagi, kapakCiz, KATEGORI_SEMBOL } from './bilde.mjs';

test('yazi: Source Serif 4 ile metin buffer üretir', async () => {
  const katman = await yazi('Regjeringen legger fram ny krisepakke', {
    aile: 'SourceSerif4',
    boyut: 48,
    kalinlik: 600,
    genislik: 800,
  });
  assert.ok(Buffer.isBuffer(katman.input));
  assert.ok(katman.genislik > 0);
  assert.ok(katman.yukseklik > 0);
});

test('yazi: Archivo ile büyük harf ve harf aralıklı etiket üretir', async () => {
  const katman = await yazi('innenriks', {
    aile: 'Archivo',
    boyut: 24,
    kalinlik: 700,
    buyukHarf: true,
    aralik: 0.08,
  });
  assert.ok(Buffer.isBuffer(katman.input));
  assert.ok(katman.genislik > 0);
  assert.ok(katman.yukseklik > 0);
});

test('sigdir: tuval içine sığan katmanı olduğu gibi döner', async () => {
  const katman = await yazi('Kort tittel', {
    aile: 'SourceSerif4',
    boyut: 32,
    genislik: 400,
  });

  const sonuc = await sigdir({
    input: katman.input,
    left: 80,
    top: 100,
    genislik: katman.genislik,
    yukseklik: katman.yukseklik,
  });

  assert.equal(sonuc.left, 80);
  assert.equal(sonuc.top, 100);
  assert.equal(sonuc.input, katman.input);
});

test('sigdir: tuvalden taşan katmanı tuvale sığacak şekilde küçültür', async () => {
  // 1200x675 tuvalde left=1100, genislik=300 -> taşma olur (1100 + 300 = 1400 > 1160)
  const buyukKatman = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  }).png().toBuffer();

  const sonuc = await sigdir({
    input: buyukKatman,
    left: 1000,
    top: 500,
    genislik: 400,
    yukseklik: 300,
  });

  assert.equal(sonuc.left, 1000);
  assert.equal(sonuc.top, 500);
  assert.notEqual(sonuc.input, buyukKatman);

  const meta = await sharp(sonuc.input).metadata();
  // B = 1200, enFazlaG = 1200 - 40 - 1000 = 160
  // H = 675, enFazlaY = 675 - 500 = 175
  assert.ok(meta.width <= 160);
  assert.ok(meta.height <= 175);
});

test('KATEGORI_SEMBOL: 6 standart kategori sembolü içerir', () => {
  const kategorier = ['innenriks', 'utenriks', 'okonomi', 'sport', 'kultur', 'teknologi'];
  for (const kat of kategorier) {
    assert.ok(KATEGORI_SEMBOL[kat], `${kat} sembolü tanımlı olmalı`);
  }
});

test('sakKapagi: standart başlık ve ingress ile geçerli 1200x675 PNG üretir', async () => {
  const png = await kapakCiz(sakKapagi({
    tittel: 'Stortinget vedtar nye tiltak for å sikre kraftforsyningen',
    ingress: 'Et bredt flertall på Stortinget har tirsdag samlet seg om en ny pakke for å styrke nettkapasiteten og støtte industrien i Sør-Norge.',
    kategori: 'innenriks',
    dato: '2026-10-13T12:00:00+02:00',
    kilde: 'Stortinget',
  }));

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);

  const meta = await sharp(png).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
  assert.equal(meta.format, 'png');
});

test('sakKapagi: Norveççe özel karakterleri (æ, ø, å, « », –) hatasız işler', async () => {
  const png = await kapakCiz(sakKapagi({
    tittel: '«Et historisk løft for bøndene», sier næringsministeren om avtalen',
    ingress: 'Avtalen sikrer bøndene 1,8 milliarder kroner i økt inntekt over to år.',
    kategori: 'okonomi',
    dato: '2026-10-13T12:00:00+02:00',
  }));

  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);

  const meta = await sharp(png).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
});

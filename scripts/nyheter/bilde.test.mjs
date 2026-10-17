import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { yazi, sigdir, sakKapagi, kapakCiz, KATEGORI_SEMBOL } from './bilde.mjs';
import { lagBilde } from './lib.mjs';

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

test('KATEGORI_SEMBOL: økonomi ve okonomi anahtarlarının her ikisini de destekler', () => {
  assert.ok(KATEGORI_SEMBOL['okonomi'], 'okonomi sembolü tanımlı olmalı');
  assert.ok(KATEGORI_SEMBOL['økonomi'], 'økonomi sembolü tanımlı olmalı');
  assert.equal(KATEGORI_SEMBOL['økonomi'], KATEGORI_SEMBOL['okonomi']);
});

test('sakKapagi: yalnız başlık ve özet; rakam, kategori ve kaynak çizilmez', async () => {
  const veri = await sakKapagi({
    tittel: 'Styringsrenten holdes uendret på 4,5 prosent',
    ingress: 'Norges Bank besluttet torsdag å holde styringsrenten uendret. Komiteen mener det er behov for å holde renten oppe.',
    kategori: 'økonomi',
    dato: '2026-10-13T12:00:00+02:00',
    rakam: { etiket: 'STYRINGSRENTE', deger: '4,50 %' },
    kilde: 'Norges Bank',
  });

  // Sahibin isteği: veri kutusu, kategori ve kaynak yok; Fjord kapağında katmanlar yalnız imza ve başlık
  assert.doesNotMatch(veri.svg, /width="330"/);
  assert.equal(veri.katmanlar.length, 2);

  const png = await kapakCiz(veri);
  assert.ok(Buffer.isBuffer(png));
  assert.ok(png.length > 5000);

  const meta = await sharp(png).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
  assert.equal(meta.format, 'png');
});

test('lagBilde: sak.bilde tanımlı olmadığında sakKapagi ile editoryal kapak üretir', async () => {
  const sak = {
    title: 'Ny rapport viser økt verdiskaping i distriktene',
    description: 'En ny undersøkelse fra SSB viser at verdiskapingen i distriktskommunene har økt kraftig det siste året.',
    category: 'innenriks',
    date: '2026-10-13T12:00:00+02:00',
    kilde: { navn: 'Statistisk sentralbyrå' },
  };

  const bilde = await lagBilde(sak);
  assert.ok(bilde);
  assert.equal(bilde.alt, 'Illustrasjon: «Ny rapport viser økt verdiskaping i distriktene»');
  assert.equal(bilde.kreditt, 'Illustrasjon: tidsrøst');
  assert.ok(Buffer.isBuffer(bilde.png));

  const meta = await sharp(bilde.png).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
  assert.equal(meta.format, 'png');
});

test('lagBilde: sak.bilde özel tanımlandığında özel grafiği üretir', async () => {
  const sak = {
    title: 'Varsel om fare for flom',
    bilde: {
      svg: () => '<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="675" fill="#123456"/></svg>',
      alt: 'Flomvarsel for Vestland',
      kreditt: 'Illustrasjon: Varsom / NVE',
    },
  };

  const bilde = await lagBilde(sak);
  assert.ok(bilde);
  assert.equal(bilde.alt, 'Flomvarsel for Vestland');
  assert.equal(bilde.kreditt, 'Illustrasjon: Varsom / NVE');
  assert.ok(Buffer.isBuffer(bilde.png));

  const meta = await sharp(bilde.png).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 675);
  assert.equal(meta.format, 'png');
});


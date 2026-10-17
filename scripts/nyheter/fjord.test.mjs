import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { bol, fjordKart, fontIzi, fontlariDenetle, FONT_IZI } from './fjord.mjs';
import { kapakCiz } from './bilde.mjs';

test('bol: iki noktalı ön ek üst satır, tireli kuyruk alt başlık olur', () => {
  assert.deepEqual(bol('Vannskuter veltet i Bodø: Kvinne svømte 200 meter til land, mann savnet'),
    { kicker: 'Vannskuter veltet i Bodø', ana: 'Kvinne svømte 200 meter til land, mann savnet', alt: null });
  assert.deepEqual(bol('Hver fjerde budsjettkrone hentes fra oljefondet – 608,4 milliarder i 2027-forslaget'),
    { kicker: null, ana: 'Hver fjerde budsjettkrone hentes fra oljefondet', alt: '608,4 milliarder i 2027-forslaget' });
  assert.deepEqual(bol('Togstreiken er over etter nesten en måned'), { kicker: null, ana: 'Togstreiken er over etter nesten en måned', alt: null });
});

test('yazı tipleri yüklü: her kesimin parmak izi beklenenle aynı (sessiz yedek yazı tipine düşme yok)', async () => {
  await fontlariDenetle();
  for (const font of Object.keys(FONT_IZI)) {
    const iz = await fontIzi(font);
    assert.ok(Math.abs(iz.w - FONT_IZI[font].w) / FONT_IZI[font].w <= 0.04, `${font} genişlik ${iz.w}`);
  }
});

for (const [bicim, w, h] of [['kapak', 1200, 675], ['post', 1080, 1350], ['story', 1080, 1920]]) {
  test(`fjordKart ${bicim}: ${w}×${h} PNG, Norveççe karakterler`, async () => {
    const png = await kapakCiz(fjordKart({ tittel: '«Et historisk løft for bøndene», sier næringsministeren – avtalen gir 1,8 milliarder', ingress: 'Avtalen sikrer bøndene økt inntekt over to år.' }, bicim));
    const meta = await sharp(png).metadata();
    assert.equal(meta.width, w);
    assert.equal(meta.height, h);
  });
}

test('fjordKart: harita kapağı post ve story\'de üstte durur, site kapağında kullanılmaz', async () => {
  const omslag = await sharp({ create: { width: 1200, height: 675, channels: 3, background: '#ffaa00' } }).png().toBuffer();
  const post = await fjordKart({ tittel: 'Gult farevarsel for kraftige vindkast i Finnmark', omslag }, 'post');
  assert.equal(post.katmanlar[0].top, 80);
  const kapak = await fjordKart({ tittel: 'Gult farevarsel for kraftige vindkast i Finnmark', omslag }, 'kapak');
  assert.equal(kapak.katmanlar.length, 2);
});

test('fjordKart: imzalı yazı üstte kırmızı tür + yazar bandı alır, haberde bant yok', async () => {
  const imzali = await fjordKart({ tittel: 'Hver fjerde budsjettkrone hentes fra oljefondet', forfatter: 'Şenol Dak', sjanger: 'forklart' }, 'kapak');
  assert.match(imzali.svg, /<rect x="0" y="0" width="1200" height="\d+" fill="#c8281e"\/>/);
  const haber = await fjordKart({ tittel: 'Hver fjerde budsjettkrone hentes fra oljefondet' }, 'kapak');
  assert.doesNotMatch(haber.svg, /<rect x="0" y="0" width="1200"[^>]*#c8281e/);
  const png = await kapakCiz(fjordKart({ tittel: 'Styringsrenten – kjøpekraften øker', forfatter: 'Şenol Dak', sjanger: 'forklart' }, 'story'));
  assert.equal((await sharp(png).metadata()).height, 1920);
});

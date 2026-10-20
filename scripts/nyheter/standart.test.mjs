// TEK KAYNAK: mecmua/standartlar/standart.test.mjs (kopyala.mjs ile sitelere yazılır).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { standartDenetle, standartBirlestir, kaynakBenzerligi, yayinDurduMu } from './standart.mjs';

// Yatırım tavsiyesi kuralı yalnız finfolis ve kifobu kopyalarında dolu (kopyala.mjs).
const KURAL = JSON.parse(readFileSync(new URL('./standart-kurallar.json', import.meta.url), 'utf8'));
const tavsiyeVar = KURAL.tr.yatirimTavsiyesi.length > 0;

const kurallar = (s) => s.kirmizi.map((b) => b.kural);
const sarilar = (s) => s.sari.map((b) => b.kural);

test('temiz ekonomi haberi geçer', () => {
  const s = standartDenetle({ dil: 'tr', baslik: 'Merkez bankası faizi yüzde 40 seviyesinde sabit tuttu', metin: 'Karar piyasa beklentisiyle uyumlu oldu. Enflasyon eylülde yüzde 33 oldu.' });
  assert.equal(s.karar, 'temiz');
  assert.equal(s.gerekce, '');
});

test('suç: kişi tanınabiliyorsa kırmızı (tr, nb, en)', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Eski mühendis Ahmet Yılmaz tutuklandı.' })).includes('suc'));
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Şirketin 34 yaşındaki çalışanı tutuklandı.' })).includes('suc'));
  assert.ok(kurallar(standartDenetle({ dil: 'nb', metin: 'En mann i 40-årene er siktet for brannen.' })).includes('suc'));
  assert.ok(kurallar(standartDenetle({ dil: 'en', metin: 'The founder, John Smith, was arrested on Monday.' })).includes('suc'));
});

test('suç: kişi yoksa sarı suc-genel, haber yayımlanır', () => {
  const s = standartDenetle({ dil: 'tr', metin: "Fransa'daki gösterilerde yüzlerce kişi gözaltına alındı." });
  assert.equal(s.karar, 'sari');
  assert.ok(sarilar(s).includes('suc-genel'));
  assert.equal(standartDenetle({ dil: 'en', metin: 'Prosecutors charged the company with fraud.' }).karar, 'sari');
  assert.equal(standartDenetle({ dil: 'nb', metin: 'Selskapet er dømt for bedrageri, ifølge tingretten.' }).karar, 'sari');
});

test('Türkçe büyük İ ve ı doğru küçülür', () => {
  assert.ok(sarilar(standartDenetle({ dil: 'tr', baslik: 'İDDİANAME KABUL EDİLDİ' })).includes('suc-genel'));
});

test('çocuk ve ölüm aynı cümlede kırmızı, ayrı cümlelerde değil', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Okulda bir çocuk hayatını kaybetti.' })).includes('cocuk'));
  const ayri = standartDenetle({ dil: 'tr', metin: 'Çocuk parası artırıldı. Başka bir haberde yangında iki kişi öldü.' });
  assert.ok(!kurallar(ayri).includes('cocuk'));
});

test('intihar, terör, savaş tarafı dili kırmızı', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'en', metin: 'Suicide rates rose.' })).includes('intihar'));
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'PKK açıklama yaptı.' })).includes('teror'));
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Saldırıda üç asker şehit oldu.' })).includes('savas-dili'));
});

test('Türkiye devlet büyükleri kırmızı; başka ülkenin cumhurbaşkanı değil', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Erdoğan yeni paketi açıkladı.' })).includes('turkiye-devlet'));
  assert.ok(!kurallar(standartDenetle({ dil: 'tr', metin: 'ABD Cumhurbaşkanı gümrük vergisini artırdı.' })).includes('turkiye-devlet'));
  assert.ok(!kurallar(standartDenetle({ dil: 'en', metin: 'Researchers at MIT built a new chip.' })).includes('turkiye-devlet'));
});

test('gülen yüz terör sayılmaz', () => {
  assert.ok(!kurallar(standartDenetle({ dil: 'tr', metin: 'Gülen yüzler ve yeni ürün tanıtıldı.' })).includes('teror'));
});

test('grup ve suç aynı cümlede kırmızı; grup tek başına sarı', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'nb', metin: 'Innvandrere står bak mer kriminalitet, hevder rapporten.' })).includes('grup-genelleme'));
  const sari = standartDenetle({ dil: 'tr', metin: 'Mülteci sayısı yıl içinde arttı.' });
  assert.equal(sari.karar, 'sari');
  assert.ok(sarilar(sari).includes('grup-konu'));
  assert.ok(!kurallar(standartDenetle({ dil: 'tr', metin: 'Birleşik Arap Emirlikleri merkezli fon yatırımcılar arasında.' })).includes('grup-genelleme'));
});

test('yatırım tavsiyesi kırmızı; sorumluluk reddi değil', { skip: !tavsiyeVar && 'bu sitede tavsiye kuralı yok' }, () => {
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Analistler hisse için hedef fiyatı 120 liraya yükseltti.' })).includes('yatirim-tavsiyesi'));
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Uzmanlar hisse için AL diyor.' })).includes('yatirim-tavsiyesi'));
  assert.ok(kurallar(standartDenetle({ dil: 'en', metin: 'The bank set a price target of $40.' })).includes('yatirim-tavsiyesi'));
  assert.equal(standartDenetle({ dil: 'tr', metin: 'Bu içerik yatırım tavsiyesi değildir.' }).karar, 'temiz');
});

test('medya adı: yalnız verilen liste, büyük/küçük harf duyarlı; liste yoksa denetim yok', () => {
  const medyaAdlari = ['Örnek Haber', 'XY'];
  assert.ok(kurallar(standartDenetle({ dil: 'en', metin: 'According to Örnek Haber, the deal closed.', medyaAdlari })).includes('medya-adi'));
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: "XY'nin haberine göre anlaşma imzalandı.", medyaAdlari })).includes('medya-adi'));
  assert.ok(!kurallar(standartDenetle({ dil: 'tr', metin: 'Şirket örnek haber paylaştı. Uygulama xy güncellendi.', medyaAdlari })).includes('medya-adi'));
  assert.ok(!kurallar(standartDenetle({ dil: 'en', metin: 'According to Örnek Haber, the deal closed.' })).includes('medya-adi'));
});

test('özel haber kalıbı yazıda ya da kaynak metinde kırmızı', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Edindiğimiz bilgiye göre şirket satılıyor.' })).includes('ozel-haber'));
  const k = standartDenetle({ dil: 'en', metin: 'The company is in talks to sell its unit.', kaynakMetni: 'The company is in talks, people familiar with the matter said.' });
  assert.ok(kurallar(k).includes('ozel-haber'));
});

test('kaynağa çok yakın yeniden yazım kırmızı', () => {
  const kaynak = 'The central bank kept its benchmark rate unchanged at four percent on Thursday and said inflation was moving toward the target while growth remained weak across the region and unemployment edged higher in the third quarter according to official figures released by the statistics office.';
  const kopya = 'The central bank kept its benchmark rate unchanged at four percent on Thursday and said inflation was moving toward the target.';
  assert.equal(kaynakBenzerligi(kopya, kaynak).kopya, true);
  assert.ok(kurallar(standartDenetle({ dil: 'en', metin: kopya, kaynakMetni: kaynak })).includes('kaynak-benzerligi'));
  const ozgun = 'Rates stay at four percent. Policymakers see prices cooling, but the economy is soft and joblessness rose slightly.';
  assert.equal(kaynakBenzerligi(ozgun, kaynak).kopya, false);
});

test('sarı kurallar yayını durdurmaz ama işaretlenir', () => {
  const s = standartDenetle({ dil: 'nb', metin: 'To personer omkom i en ulykke på E6.' });
  assert.equal(s.karar, 'sari');
  assert.ok(sarilar(s).includes('olum-kaza'));
  assert.equal(s.gerekce, 'standart:sari:olum-kaza');
});

test('iki dilli birleştirme en ağır kararı alır', () => {
  const b = standartBirlestir(standartDenetle({ dil: 'tr', metin: 'Temiz metin.' }), standartDenetle({ dil: 'en', metin: 'The suspect, John Smith, was arrested.' }));
  assert.equal(b.karar, 'kirmizi');
  assert.match(b.gerekce, /^standart:kirmizi:suc/);
});

test('bilinmeyen dil hata verir', () => {
  assert.throws(() => standartDenetle({ dil: 'de', metin: 'x' }));
});

test('yayinDurduMu: bayrak, kapalı, ulaşılamaz', async () => {
  const yanit = (j, ok = true) => async () => ({ ok, status: ok ? 200 : 500, json: async () => j });
  assert.equal((await yayinDurduMu({ url: 'https://s', anahtar: 'a', site: 'x', fetchFn: yanit({ durdu: true }) })).durdu, true);
  assert.equal((await yayinDurduMu({ url: 'https://s', anahtar: 'a', site: 'x', fetchFn: yanit({ durdu: false }) })).durdu, false);
  assert.equal((await yayinDurduMu({ url: 'https://s', anahtar: 'a', site: 'x', fetchFn: yanit({}, false) })).durdu, false);
  assert.equal((await yayinDurduMu({ url: 'https://s', anahtar: 'a', site: 'x', fetchFn: async () => { throw new Error('ağ'); } })).durdu, false);
  assert.equal((await yayinDurduMu({})).durdu, false);
});

test('kurum ve açık olumsuz yargı aynı cümlede kırmızı; olgu cümlesi temiz', () => {
  assert.ok(kurallar(standartDenetle({ dil: 'tr', metin: 'Hükümet bu konuda beceriksizdir.' })).includes('kurum-degerlendirme'));
  assert.ok(kurallar(standartDenetle({ dil: 'nb', metin: 'Regjeringen har feilet.' })).includes('kurum-degerlendirme'));
  assert.ok(!kurallar(standartDenetle({ dil: 'tr', metin: 'Merkez bankası faizi indirdi.' })).includes('kurum-degerlendirme'));
  assert.ok(!kurallar(standartDenetle({ dil: 'en', metin: 'The ministry said the company has failed to pay taxes.' })).includes('kurum-degerlendirme'));
});

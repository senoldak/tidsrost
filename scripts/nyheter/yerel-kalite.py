#!/usr/bin/env python3
# Yerel kalite gölgesi (28 Ekim 2026). Bot turunda yayına giden haberler (kaliteKaydet, yerel-model.mjs) runner'ın
# geçici dosyasına yazılır; bu betik onları okur. LangExtract, yerel Gemma ile (yerel-model-baslat.sh, 8092) haberdeki
# rakamları ve doğrudan alıntıları çıkarır; her biri kaynakta aranır:
#   rakam:  sayı kaynakta var mı (biçim farkı ve %0,5 pay); varsa Gemma'ya "kaynak bunu destekliyor mu?" sorulur.
#   alıntı: alıntının sözcükleri kaynakta sırasıyla geçiyor mu (en iyi pencerede ≥ 0,8 benzerlik).
# Yalnız loga yazar ve hiçbir şeyi durdurmaz. Kaynak metni loga girmez: şüpheli satırda yalnız haberin kendi (yayımlanmış)
# metninden en çok 80 karakter durur. Kullanım: python3 yerel-kalite.py <kalite.jsonl>
import difflib
import json
import re
import sys
import time
import urllib.request

import langextract as lx
from langextract.factory import ModelConfig

SOHBET = 'http://127.0.0.1:8092'
AZAMI_HABER = 8
BUTCE_SN = 600
PAY = 0.005

ISTEM = (
    'Extract every number that states a fact (amounts, percentages, counts; skip dates and years) and every direct '
    'quotation in quotation marks. Use exact text from the input, in order of appearance. The text may be Norwegian, '
    'Turkish or English. For a number give what it measures as the attribute "konu"; for a quotation give the speaker '
    'as "kim" if the text names one.'
)
ORNEKLER = [
    lx.data.ExampleData(
        text='The central bank raised its policy rate to 4.5 percent, and unemployment fell to 3.1 percent. '
        '"We will act again if needed," the governor said.',
        extractions=[
            lx.data.Extraction(extraction_class='rakam', extraction_text='4.5 percent', attributes={'konu': 'policy rate'}),
            lx.data.Extraction(extraction_class='rakam', extraction_text='3.1 percent', attributes={'konu': 'unemployment'}),
            lx.data.Extraction(extraction_class='alinti', extraction_text='We will act again if needed', attributes={'kim': 'the governor'}),
        ],
    )
]
AYAR = ModelConfig(model_id='gemma-yerel', provider='openai', provider_kwargs={'api_key': 'yerel', 'base_url': f'{SOHBET}/v1'})


def sayilar(s):
    """Metindeki sayıların olası değerleri (1.234,5 / 1,234.5 / 1 234 belirsizliği için her iki okuma)."""
    out = set()
    for m in re.finditer(r'\d[\d.,   ]*', s):
        ham = re.sub(r'[\s  ]', '', m.group()).strip('.,')
        if not ham:
            continue
        okumalar = {ham.replace('.', '').replace(',', '.'), ham.replace(',', '')}
        if ',' in ham and '.' in ham:
            ondalik = ',' if ham.rfind(',') > ham.rfind('.') else '.'
            binlik = '.' if ondalik == ',' else ','
            okumalar = {ham.replace(binlik, '').replace(ondalik, '.')}
        for o in okumalar:
            try:
                out.add(float(o))
            except ValueError:
                pass
    return out


def kaynakta_sayi(deger, kaynak_sayilari):
    return any(abs(k - d) <= abs(k) * PAY or k == d for d in deger for k in kaynak_sayilari)


def cumleler(metin):
    return [c.strip() for c in re.split(r'(?<=[.!?])\s+|\n+', metin) if c.strip()]


def pencere(kaynak, deger):
    """Kaynakta bu sayıyı içeren en çok 3 cümle (Gemma'ya gidecek bağlam)."""
    secilen = [c for c in cumleler(kaynak) if kaynakta_sayi(deger, sayilar(c))]
    return ' '.join(secilen[:3])[:1200]


def cumle(metin, aralik):
    bas, son = aralik.start_pos, aralik.end_pos
    nokta, satir_sonu = metin.rfind('. ', 0, bas + 1), metin.rfind('\n', 0, bas)
    b = max(nokta + 2 if nokta >= 0 else 0, satir_sonu + 1)
    s = min([i for i in (metin.find('. ', son), metin.find('\n', son)) if i >= 0] or [len(metin)])
    return metin[b:s + 1].strip()[:600]


def gemma_destekler(iddia, baglam):
    govde = {
        'messages': [
            {'role': 'system', 'content': 'You check news against a source. Answer with exactly one word: YES or NO.'},
            {'role': 'user', 'content': f'SOURCE: {baglam}\n\nCLAIM: {iddia}\n\nDoes the source support the number in the claim, '
             'for the same thing it measures? Answer YES or NO.'},
        ],
        'temperature': 0,
        'max_tokens': 16,
        'chat_template_kwargs': {'enable_thinking': False},
    }
    istek = urllib.request.Request(f'{SOHBET}/v1/chat/completions', json.dumps(govde).encode(), {'Content-Type': 'application/json'})
    with urllib.request.urlopen(istek, timeout=60) as r:
        metin = json.load(r)['choices'][0]['message'].get('content') or ''
    m = re.findall(r'\b(YES|NO|JA|NEI|EVET|HAYIR)\b', metin, re.I)
    return None if not m else m[-1].lower() in ('yes', 'ja', 'evet')


def sade(s):
    return re.sub(r'[^\w\s]', ' ', s.lower()).split()


def alinti_kaynakta(alinti, kaynak):
    a = sade(alinti)
    k = sade(kaynak)
    if not a:
        return True
    n = len(a)
    en_iyi = 0.0
    for i in range(0, max(1, len(k) - n + 1)):
        en_iyi = max(en_iyi, difflib.SequenceMatcher(None, a, k[i:i + n]).ratio())
        if en_iyi >= 0.8:
            return True
    return False


def satir(ad, alan):
    print(f'{ad} {json.dumps(alan, ensure_ascii=False)}', flush=True)


def isle(h):
    bas = time.time()
    metin, kaynak = h['metin'], h['kaynak']
    sonuc = lx.extract(text_or_documents=metin, prompt_description=ISTEM, examples=ORNEKLER, config=AYAR, max_workers=1,
                       show_progress=False)
    kaynak_sayilari = sayilar(kaynak)
    o = {'id': h['id'], 'dil': h['dil'], 'rakam': 0, 'rakam_kaynakta': 0, 'gemma_evet': 0, 'gemma_hayir': 0, 'alinti': 0,
         'alinti_kaynakta': 0}
    for e in sonuc.extractions:
        if not e.char_interval:
            continue  # metinde bulunamayan çıkarım (örnekten uydurma)
        kisa = e.extraction_text[:80]
        if e.extraction_class == 'rakam':
            deger = sayilar(e.extraction_text)
            if not deger or all(d.is_integer() and d <= 16 for d in deger):
                continue  # küçük tam sayılar (bot denetimiyle aynı)
            o['rakam'] += 1
            if not kaynakta_sayi(deger, kaynak_sayilari):
                satir('kalite-şüphe', {'id': h['id'], 'dil': h['dil'], 'tur': 'rakam', 'metin': kisa, 'neden': 'kaynakta-yok'})
                continue
            o['rakam_kaynakta'] += 1
            try:
                evet = gemma_destekler(cumle(metin, e.char_interval), pencere(kaynak, deger))
            except Exception:
                evet = None
            if evet is True:
                o['gemma_evet'] += 1
            elif evet is False:
                o['gemma_hayir'] += 1
                satir('kalite-şüphe', {'id': h['id'], 'dil': h['dil'], 'tur': 'rakam', 'metin': kisa, 'neden': 'gemma-hayir'})
        elif e.extraction_class == 'alinti':
            o['alinti'] += 1
            if alinti_kaynakta(e.extraction_text, kaynak):
                o['alinti_kaynakta'] += 1
            else:
                satir('kalite-şüphe', {'id': h['id'], 'dil': h['dil'], 'tur': 'alinti', 'metin': kisa, 'neden': 'kaynakta-yok'})
    o['sn'] = round(time.time() - bas)
    satir('kalite-ölçüm', o)


def main(dosya):
    try:
        with open(dosya, encoding='utf8') as f:
            haberler = [json.loads(s) for s in f if s.strip()]
    except FileNotFoundError:
        print('yerel-kalite: bu turda yayına giden haber yok')
        return
    bas = time.time()
    for h in haberler[:AZAMI_HABER]:
        if time.time() - bas > BUTCE_SN:
            print('yerel-kalite: süre bütçesi doldu, kalan haberler atlandı')
            break
        try:
            isle(h)
        except Exception as e:  # tek haberin hatası ötekileri durdurmasın
            print(f'yerel-kalite: {h.get("id")} işlenemedi ({type(e).__name__})')


if __name__ == '__main__':
    main(sys.argv[1])

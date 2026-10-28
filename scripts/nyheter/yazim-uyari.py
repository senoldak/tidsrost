#!/usr/bin/env python3
# Haftalık yazım uyarısı (28 Ekim 2026). Son GUN günde yayımlanan yazılarda yazım denetleyicisinin tanımadığı sözcükleri
# listeler: Türkçede akana, Norveççede divvunspell (speller-nob). Seçim ölçüme dayanır
# (mecmua/docs/olcum-yazim-dort-arac-2026-10-28.md). Yalnız uyarıdır: yayını durdurmaz, repoya ve yazılara yazmaz.
# Gürültüyü kısmak için yalnız şu sözcükler denetlenir:
#   - tamamı küçük harfli, en az 3 harfli, kesme işaretsiz sözcükler (özel adlar, kısaltmalar, iPhone gibi markalar ve
#     ekli adlar dışarıda);
#   - arşivde daha önceki hiçbir yazıda geçmemiş sözcükler (önceden kullanılan sözcük büyük olasılıkla doğrudur; yeni bir
#     sözcük bir kez listelenir, sonraki haftalar yeniden gelmez, ayrı izin listesine gerek kalmaz).
# Kullanım: python yazim-uyari.py <tr|nb> <içerik klasörü> <gün> <çıktı.md> [divvun klasörü]
import datetime
import json
import os
import pathlib
import re
import subprocess
import sys

AZAMI_SATIR = 80
SOZ = {'tr': re.compile(r"[^\W\d_]+(?:'[^\W\d_]+)?"), 'nb': re.compile(r'[^\W\d_]+(?:-[^\W\d_]+)*')}


def alan(on, ad):
    m = re.search(rf'^{ad}:\s*"?(.*?)"?\s*$', on, re.M)
    return m.group(1) if m else ''


def temizle(g):
    g = re.sub(r'```.*?```', ' ', g, flags=re.S)
    g = re.sub(r'!\[[^\]]*\]\([^)]*\)', ' ', g)
    g = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', g)
    g = re.sub(r'<[^>]+>', ' ', g)
    g = re.sub(r'^\|.*$', ' ', g, flags=re.M)
    g = re.sub(r'`[^`]*`', ' ', g)
    g = re.sub(r'https?://\S+', ' ', g)
    g = re.sub(r'^[#>*\-\s]+', '', g, flags=re.M)
    return re.sub(r'[*_]{1,2}', '', g)


def tarih_coz(s):
    try:
        t = datetime.datetime.fromisoformat(s.strip('"\'').replace('Z', '+00:00'))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=datetime.timezone.utc)


def yazilar(klasor):
    out = []
    for d in pathlib.Path(klasor).iterdir():
        p = d / 'index.md' if d.is_dir() else d
        if not p.exists() or p.suffix != '.md':
            continue
        m = re.match(r'---\n(.*?)\n---\n(.*)', p.read_text(encoding='utf8').replace('\r\n', '\n'), re.S)
        if not m:
            continue
        on, govde = m.groups()
        t = re.search(r'^(?:date|pubDate):\s*(\S+)', on, re.M)
        tarih = tarih_coz(t.group(1)) if t else None
        if tarih:
            metin = '\n'.join([alan(on, 'title'), alan(on, 'description'), temizle(govde)])
            out.append({'yol': d.name if d.is_dir() else d.stem, 'tarih': tarih, 'metin': metin})
    return out


def aday(w):
    return len(w) >= 3 and w == w.lower() and "'" not in w


def akana_yanlis(ws, _):
    import akana
    sc = akana.SpellChecker()
    return {w for w in ws if not sc.is_correct(w)}


def divvun_yanlis(ws, klasor):
    yanlis = set()
    for i in range(0, len(ws), 400):
        r = subprocess.run([str(pathlib.Path(klasor) / 'divvunspell'), 'suggest', '--archive',
                            str(pathlib.Path(klasor) / 'nob.bhfst'), '--json', '-n', '1', *ws[i:i + 400]],
                           capture_output=True, text=True, encoding='utf8', check=True)
        yanlis |= {k['word'] for k in json.loads(r.stdout).get('suggest', []) if not k['is_correct']}
    return yanlis


DENETCI = {'tr': akana_yanlis, 'nb': divvun_yanlis}


def baglam(metin, w):
    m = re.search(rf'(?<!\w){re.escape(w)}(?!\w)', metin)
    if not m:
        return ''
    s = metin[max(0, m.start() - 60):m.end() + 40].replace('\n', ' ').replace('|', '/').replace('`', "'")
    return s.replace(w, f'**{w}**', 1).strip()


def uyar(dil, klasor, gun, simdi, denetci=None, divvun=None):
    """(bulgular, yeni yazı sayısı) döndürür; bulgu: {sozcuk, yazilar, baglam}."""
    sinir = simdi - datetime.timedelta(days=gun)
    tum = yazilar(klasor)
    yeni = [y for y in tum if sinir <= y['tarih'] <= simdi]  # planlı (ileri tarihli) yazılar henüz yayında değil
    eski = set()
    for y in tum:
        if y['tarih'] < sinir:
            eski.update(SOZ[dil].findall(y['metin']))
    yerler = {}
    for y in sorted(yeni, key=lambda y: y['tarih']):
        for w in SOZ[dil].findall(y['metin']):
            if aday(w) and w not in eski:
                yerler.setdefault(w, []).append(y)
    yanlis = (denetci or DENETCI[dil])(sorted(yerler), divvun)
    bulgular = []
    for w in sorted(yanlis):
        ys = list({y['yol']: y for y in yerler.get(w, [])}.values())
        if ys:
            bulgular.append({'sozcuk': w, 'yazilar': [y['yol'] for y in ys], 'baglam': baglam(ys[0]['metin'], w)})
    # Yazım hatası çoğunlukla tek yazıda olur; birçok yazıda geçen sözcük genelde kalıp metindeki doğru bir terimdir.
    bulgular.sort(key=lambda b: (len(b['yazilar']), b['sozcuk']))
    return bulgular, len(yeni)


def rapor(dil, gun, bulgular, yeni_sayisi):
    arac = 'akana' if dil == 'tr' else 'divvunspell'
    s = [f'### Son {gun} gün: {yeni_sayisi} yazı, {len(bulgular)} tanınmayan sözcük ({arac})', '']
    if not bulgular:
        return '\n'.join(s + ['Bu hafta tanınmayan yeni sözcük yok.', ''])
    s += ['Çoğu doğru sözcüktür (sözlükte olmayan terim, yabancı sözcük). Gerçek yazım hatasını yazıda düzelt; '
          'doğru sözcük için bir şey yapma, arşive girdiği için bir daha listelenmez.', '',
          '| Sözcük | Yazı | Bağlam |', '|---|---|---|']
    for b in bulgular[:AZAMI_SATIR]:
        yer = b['yazilar'][0][:60] + (f' (+{len(b["yazilar"]) - 1})' if len(b['yazilar']) > 1 else '')
        s.append(f"| {b['sozcuk']} | {yer} | {b['baglam']} |")
    if len(bulgular) > AZAMI_SATIR:
        s += ['', f'…ve {len(bulgular) - AZAMI_SATIR} sözcük daha (iş özetinde değil; ayrıntı için betiği elle çalıştır).']
    return '\n'.join(s + [''])


def main():
    dil, klasor, gun, cikti = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    divvun = sys.argv[5] if len(sys.argv) > 5 else None
    bulgular, n = uyar(dil, klasor, gun, datetime.datetime.now(datetime.timezone.utc), divvun=divvun)
    metin = rapor(dil, gun, bulgular, n)
    pathlib.Path(cikti).write_text(metin, encoding='utf8')
    print(metin)
    if os.environ.get('GITHUB_OUTPUT'):
        with open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf8') as f:
            f.write(f'bulgu={len(bulgular)}\n')


if __name__ == '__main__':
    main()

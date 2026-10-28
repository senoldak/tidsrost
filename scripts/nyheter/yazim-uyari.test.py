#!/usr/bin/env python3
# yazim-uyari.py testleri (sahte denetleyiciyle; akana ve divvunspell gerekmez). Çalıştır: python yazim-uyari.test.py
import datetime
import importlib.util
import pathlib
import tempfile
import unittest

_sp = importlib.util.spec_from_file_location('yazim_uyari', pathlib.Path(__file__).with_name('yazim-uyari.py'))
Y = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(Y)

SIMDI = datetime.datetime(2026, 10, 28, 12, tzinfo=datetime.timezone.utc)


def yaz(klasor, ad, tarih, govde):
    (klasor / f'{ad}.md').write_text(f'---\ntitle: "{ad}"\ndate: {tarih}\n---\n{govde}\n', encoding='utf8')


def sahte(yanlislar):
    return lambda ws, _: {w for w in ws if w in yanlislar}


class Uyari(unittest.TestCase):
    def setUp(self):
        self.gecici = tempfile.TemporaryDirectory()
        self.k = pathlib.Path(self.gecici.name)
        yaz(self.k, 'eski', '2026-10-01T10:00:00Z', 'Faiz ondalığa yuvarlandı.')
        yaz(self.k, 'yeni', '2026-10-27T10:00:00+03:00', 'Faiz ondalığa yuvarlandı, görüniyor ki Apple ve iPhone büyüdü.')
        yaz(self.k, 'planli', '2026-11-05T08:00:00Z', 'Gelecekte hedefliores yazılacak.')

    def tearDown(self):
        self.gecici.cleanup()

    def test_yalniz_yeni_ve_kucuk_harfli_sozcuk(self):
        b, n = Y.uyar('tr', self.k, 7, SIMDI, denetci=sahte({'ondalığa', 'görüniyor', 'iPhone', 'hedefliores'}))
        self.assertEqual(n, 1)  # planlı yazı sayılmaz
        self.assertEqual([x['sozcuk'] for x in b], ['görüniyor'])  # ondalığa arşivde var, iPhone büyük harfli
        self.assertEqual(b[0]['yazilar'], ['yeni'])
        self.assertIn('**görüniyor**', b[0]['baglam'])

    def test_rapor(self):
        b, n = Y.uyar('tr', self.k, 7, SIMDI, denetci=sahte({'görüniyor'}))
        r = Y.rapor('tr', 7, b, n)
        self.assertIn('1 tanınmayan sözcük (akana)', r)
        self.assertIn('| görüniyor | yeni |', r)
        self.assertIn('yeni sözcük yok', Y.rapor('nb', 7, [], 3))

    def test_tek_yazidaki_once(self):
        yaz(self.k, 'yeni2', '2026-10-27T11:00:00Z', 'Kalıp metin: megavatsaat ve megavatsaat.')
        yaz(self.k, 'yeni3', '2026-10-27T12:00:00Z', 'Yine megavatsaat ve egenlig.')
        b, _ = Y.uyar('nb', self.k, 7, SIMDI, denetci=sahte({'megavatsaat', 'egenlig'}))
        self.assertEqual([x['sozcuk'] for x in b], ['egenlig', 'megavatsaat'])
        self.assertEqual(len(b[1]['yazilar']), 2)


if __name__ == '__main__':
    unittest.main()

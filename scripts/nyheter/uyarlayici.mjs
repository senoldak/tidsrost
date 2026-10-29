// tidsrost haber akışının motor uyarlayıcısı: hent-nyheter.mjs'nin eski akış gövdesi, ortak motorun sürebileceği iki parçaya bölündü.
//   adaylar({ simdi, log }) → [{ kimlik, yuk, baslik }]   kaynakları tarar; sett'te olmayan taze adayların hepsini döner
//   isle(adaylar, { surVar, log }) → Sonuc[]                puanlama + seçim + yazım; karar verilenler Sonuc olarak döner
// Motor yokken yerelTur aynı akışı eskisi gibi sürer (davranış değişmedi). Karar verilen her üye tilstand.sett'e işaretlenir
// (iki modda da), habere özgü hatalar tilstand.feil'e sayılır (3 deneme kuralı bunu okur).
// Sonuc = { kimlik, durum: 'yazildi' | 'elendi' | 'bekliyor', gerekce?, hata?, sayilmaz?, slug? }  (yazi yok: Telegram'a gidiş
// yayın sonrası süpürgeden olur). Sonucu olmayan aday bekliyor kalır (puanlanamadı, onay/denetim alınamadı, süre ya da pay doldu).
// Aday kimliği motorKimlik(id); medier gibi grup adaylarında sonuç `ider`'deki her üyenin kimliğine verilir.
import { skrivSak } from './lib.mjs';
import { geminiPayiBitti } from './butce.mjs';
import { vurder, velg, puanTemizle, UTEN_VURDERING } from './viktighet.mjs';
import { lesHukommelse, finnDublett, nokkel } from './dublett.mjs';
import { fjernAdresser } from './hemmelig.mjs';
import { maskerMedier } from './tekstverktoy.mjs';
import { leggTilKortFortalt, slugFor } from './kortfortalt.mjs';
import { leggTilFarevarsler, varselSidesine, slugFor as varselSlugFor } from './farevarsler.mjs';
import { dagssideAktiv } from './farevarsel-bryter.mjs';
import { yayinKapisi, sakDenetimGirdisi } from './kapi.mjs';
import { omskrivNærKilde } from './redaktor.mjs';
import { motorKaydet, motorKimlik, sariKayit } from './motor.mjs';
import { KILDER } from './kilder/liste.mjs';

// Bir kaynak ilk kez çalıştığında eski birikim yayınlanmaz: sadece son 24 saatin haberleri alınır.
const FORSTE_GANG_TIMER = 24;
const MAKS_FEIL = 3;

/** Motora giden aday yükü: kaynak yalnız adıyla (resmi kaynak adı ya da 'medier'); yük motorda şifrelenir. */
export const adayYuku = (a) => ({ id: a.id, kaynak: a.kildeNavn, tittel: String(a.tittel).slice(0, 300), tid: a.tid.toISOString() });

// Sonuc gerekçesi ve hata metni deftere, sabah özetine ve loga gider: adres ve medya adı maskelenir.
const temiz = (m) => maskerMedier(fjernAdresser(String(m)));

/** 90 günden eski sett kayıtlarını ve süresi geçmiş puan önbelleğini siler (tur sonunda, durum yazılmadan önce). */
export function durumuTemizle(tilstand, simdi = new Date()) {
  puanTemizle(tilstand.puan, simdi.getTime());
  const grense = simdi.getTime() - 90 * 864e5;
  for (const [id, t] of Object.entries(tilstand.sett)) if (Date.parse(t) < grense) delete tilstand.sett[id];
}

/**
 * @param {{ tilstand: object, simdi: Date, ayar?: object, bag?: object }} p
 *   tilstand: sett.json içeriği { sett, feil, kilder, puan }
 *   ayar: { rot, maks, sureMs, baslangic, torr }   (torr: dosya yazmadan yalnız listeler)
 *   bag: bugünkü bağımlılıklar; yalnız testler değiştirir (Gemini/ağ/disk çağıran işlevler).
 */
// Yazılan haberin motor kaydı gerekçesi: belirlenimci sarı gerekçesi + ikinci okumanın gerekçesi (boşlar atlanır, 300'de kesilir).
const yazimGerekcesi = (kapi) => [kapi.s?.karar === 'sari' ? kapi.s.gerekce : '', kapi.kapiGerekce].filter(Boolean).join(' ').slice(0, 300);

export function uyarlayiciKur({ tilstand, simdi = new Date(), ayar = {}, bag = {} }) {
  const A = { rot: '.', maks: 12, sureMs: 15 * 60_000, baslangic: Date.now(), torr: false, ...ayar };
  const B = {
    kaynaklar: KILDER,
    vurder,
    skrivSak,
    lesHukommelse,
    leggTilKortFortalt,
    leggTilFarevarsler,
    yayinKapisi,
    omskrivNærKilde,
    geminiPayiBitti,
    motorKaydet: (p) => motorKaydet({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, ...p }),
    ...bag,
  };
  tilstand.sett ??= {};
  tilstand.feil ??= {};
  tilstand.kilder ??= {};
  tilstand.puan ??= {};

  const ozet = { antall: 0, kortLagt: 0, feilListe: [], utkastListe: [], rettetListe: [], stoppListe: [], kortListe: [], varselListe: [], ventListe: [], standartElendi: [] };
  const taze = new Map(); // bu turda taranan adaylar (lag() kapanışlarıyla), motor kimliğine göre
  const zaman = () => simdi.toISOString();

  // Bir aday birden fazla kaynak öğesini kapsayabilir (medier: aynı olayın bütün siteleri); hepsi görüldü sayılır.
  const merkSett = (k) => {
    for (const id of k.ider ?? [k.id]) tilstand.sett[id] = zaman();
  };
  // Repo ve Actions logları herkese açık: haber sitelerinden gelen adayın (skjult) başlığı loglanmaz, mesajlarındaki
  // adresler ve medya adları maskelenir (bkz. hemmelig.mjs). Resmi kaynaklarda her şey olduğu gibi yazılır.
  const rens = (k, tekst) => (k.skjult ? temiz(tekst) : tekst);
  const etikett = (k) => (k.skjult ? k.id : `${k.id} «${k.tittel}»`);
  // medier adaylarının başlığının sonundaki parantez karşılaştırmada atılır.
  const kandidatTittel = (k) => k.tittel.replace(/\s*\([^)]*\)\s*$/, '');

  async function adaylar({ simdi: s = simdi, log = console.log } = {}) {
    taze.clear();
    const cikti = [];
    for (const kilde of B.kaynaklar) {
      try {
        let liste = (await kilde.hent({ sett: tilstand.sett })).filter((k) => !tilstand.sett[k.id]);
        for (const id of kilde.alleredeSett ?? []) tilstand.sett[id] = s.toISOString();
        liste.sort((a, b) => b.tid - a.tid);
        for (const k of liste) k.kildeNavn = kilde.navn;
        if (!tilstand.kilder[kilde.navn]) {
          const grense = s.getTime() - FORSTE_GANG_TIMER * 36e5;
          const forste = kilde.forsteGang ? liste.slice(0, kilde.forsteGang) : liste.filter((k) => k.tid.getTime() >= grense);
          for (const k of liste) if (!forste.includes(k)) merkSett(k);
          liste = forste;
          tilstand.kilder[kilde.navn] = s.toISOString();
        }
        for (const k of liste) {
          taze.set(motorKimlik(k.id), k);
          cikti.push({ kimlik: motorKimlik(k.id), yuk: adayYuku(k), baslik: k.skjult ? '' : k.tittel });
        }
        log(`${kilde.navn}: ${liste.length} nye`);
      } catch (e) {
        console.error(`${kilde.navn}: FEIL ${rens(kilde, e.message)}`);
      }
    }
    return cikti;
  }

  async function isle(girdi, { surVar, log = console.log, kapi: ikinciKapi = null } = {}) {
    const hukommelse = await B.lesHukommelse(A.rot);
    const standartLogg = (m) => log(temiz(m));
    const sonuclar = [];
    const yer = new Map();
    // Aynı kimliğe sonradan gelen sonuç öncekinin yerine geçer.
    const koy = (s) => {
      if (yer.has(s.kimlik)) sonuclar[yer.get(s.kimlik)] = s;
      else {
        yer.set(s.kimlik, sonuclar.length);
        sonuclar.push(s);
      }
    };
    const uyeler = (k) => (k.ider ?? [k.id]).map((id) => motorKimlik(id));
    const elendi = (k, gerekce) => uyeler(k).forEach((kimlik) => koy({ kimlik, durum: 'elendi', gerekce: temiz(gerekce) }));
    const ele = (k, gerekce) => {
      merkSett(k);
      elendi(k, gerekce);
    };
    const yazildi = (k, slug) => uyeler(k).forEach((kimlik) => koy({ kimlik, durum: 'yazildi', slug }));
    const sureDoldu = () => Date.now() - A.baslangic > A.sureMs;
    // Motor payı (surVar) verilmişse onu, yoksa süre ve Gemini turu payını sorar.
    const payNedeni = () => {
      if (surVar) return surVar() ? null : 'tur';
      if (sureDoldu()) return 'sure';
      return B.geminiPayiBitti() ? 'gemini' : null;
    };

    // Motorun verdiği adayları bu turun taze adaylarına bağla; kaynakta artık olmayan eski aday elenir.
    const kandidater = {};
    const goruldu = new Set();
    for (const a of girdi) {
      if (goruldu.has(a.kimlik)) continue;
      goruldu.add(a.kimlik);
      const k = taze.get(a.kimlik);
      if (k) (kandidater[k.kildeNavn] ??= []).push(k);
      else if (a.eski) {
        koy({ kimlik: a.kimlik, durum: 'elendi', gerekce: 'kaynakta artık yok' });
        if (a.yuk?.id) tilstand.sett[a.yuk.id] ??= zaman();
      }
    }

    // Haber değerine göre seç (bkz. viktighet.mjs). Gemini cevap vermezse puansız, kaynaklar arasında sırayla.
    const poeng = await B.vurder(kandidater, { hukommelse: tilstand.puan }).catch((e) => {
      console.error(`viktighet: FEIL ${e.message}`);
      return null;
    });
    if (!poeng) console.warn('viktighet: ingen vurdering; bare datakilder uten poeng velges, resten sparer vi til neste kjøring');
    const { valgt, forkastet } = velg(kandidater, poeng, A.maks);
    for (const k of forkastet) {
      log(`  - ${k.id}: lav nyhetsverdi (${poeng.get(k)})`);
      if (!A.torr) ele(k, `düşük haber değeri (${poeng.get(k)})`);
    }

    let geminiKesintisi = 0; // arka arkaya "çok fazla deneme" ile düşen aday sayısı (ücretsiz plan denetimi A6)
    let ayarHatasi = null;
    for (const k of valgt) {
      // Ön denetim (Gemini çağrısından önce): kaynağın kendi başlığı yayınlanmış bir haberle aynı olayı anlatıyor mu?
      // Şablonlu veri kaynaklarında kaynak başlığı yayınlanan başlıktan farklıdır; onlar yazıldıktan sonra denetlenir.
      const forDublett = UTEN_VURDERING.has(k.kildeNavn) ? undefined : finnDublett(hukommelse, { tittel: kandidatTittel(k) });
      if (forDublett) {
        log(`  - ${k.id}: allerede publisert (${forDublett.slug})`);
        if (!A.torr) ele(k, `zaten yayımlandı (${forDublett.slug})`);
        continue;
      }
      if (A.torr) {
        log(`  [tørr] ${k.skjult ? `${k.id} (${k.ider?.length ?? 1} saker)` : `${k.id} — ${k.tittel}`}`);
        continue;
      }
      const pay = payNedeni();
      if (pay) {
        log(
          pay === 'sure'
            ? `\nTidsbudsjett utløpt (${A.sureMs / 60_000} min); resterende saker spares til neste kjøring.`
            : pay === 'tur'
              ? '\nMotorens tur-andel er brukt opp; resterende saker spares til neste kjøring.'
              : '\nGemini-budsjettet for denne kjøringen er brukt opp; resterende saker spares til neste kjøring.',
        );
        break;
      }
      try {
        const sak = await k.lag();
        if (!sak) {
          log(`  - ${k.id}: hoppet over (mangler GEMINI_API_KEY)`);
          ozet.feilListe.push(`${k.id}: hoppet over, GEMINI_API_KEY mangler`);
          continue;
        }
        // Tam haber için kaynak yetmedi: resmi duyuru günün "Kort fortalt" sayfasına satır olur (bkz. kortfortalt.mjs).
        if ('kort' in sak) {
          if (sak.kort) {
            // Satır da standart süzgecinden geçer: kırmızıysa yalnız o satır atlanır; denetim hatasında satır bekler.
            const kapi = await B.yayinKapisi({ girdi: { dil: 'nb', baslik: sak.kort.tittel, ozet: '', metin: sak.kort.ingress ?? '' }, kimlik: k.id, log: standartLogg, ikinci: ikinciKapi });
            if (kapi.karar === 'bekle') {
              ozet.ventListe.push(`${etikett(k)}: standartkontroll feilet, ${kapi.hata}`);
              log(`  - ${k.id}: venter (standartkontroll feilet)`);
              continue;
            }
            merkSett(k);
            if (kapi.karar === 'elendi') {
              ozet.standartElendi.push(`${etikett(k)}: ${kapi.s.gerekce}`);
              log(`  - ${k.id}: Kort fortalt-linje droppet (${kapi.s.gerekce})`);
              elendi(k, kapi.s.gerekce);
              continue;
            }
            const kortSlug = slugFor(new Date());
            const kortGerekce = yazimGerekcesi(kapi);
            if (kapi.s.karar === 'sari' || kortGerekce) await B.motorKaydet({ site: 'tidsrost', kayit: sariKayit(k.id, kortSlug, { gerekce: kortGerekce }) });
            ozet.kortListe.push({ k, kort: sak.kort });
            log(`  ~ ${k.id}: Kort fortalt`);
            yazildi(k, kortSlug);
          } else {
            merkSett(k);
            log(`  ~ ${k.id}: hoppet over (for lite kildemateriale)`);
            elendi(k, 'kaynak metni yetersiz');
          }
          continue;
        }
        // Vaktsjef-onayı alınamadı: haber görüldü sayılmaz, havuzda kalır ve sonraki turda yeniden denenir.
        if (sak.bekle) {
          log(`  - ${k.id}: venter (${rens(k, sak.bekle)})`);
          ozet.ventListe.push(`${etikett(k)}: ${rens(k, sak.bekle)}`);
          continue;
        }
        if (sak.hopp) {
          merkSett(k);
          log(`  - ${k.id}: hoppet over (${rens(k, sak.hopp)})`);
          ozet.feilListe.push(`${etikett(k)}: hoppet over, ${rens(k, sak.hopp)}`);
          elendi(k, sak.hopp);
          continue;
        }
        // Son denetim: yazılan başlık ve giriş, son 72 saatte (ya da bu çalışmada) yayınlanmış bir haberle aynı olay mı?
        const dublett = finnDublett(hukommelse, { tittel: sak.title, ingress: sak.description, tekst: sak.body }, { strengt: sak.produksjon === 'automatisk' });
        if (dublett) {
          merkSett(k);
          log(`  - ${k.id}: hoppet over (samme hendelse som ${dublett.slug})`);
          elendi(k, `zaten yayımlandı (${dublett.slug})`);
          continue;
        }
        // Haber değeri künyeye yazılır; sosyal medyada günün Reels haberleri buna göre seçilir (scripts/sosial/saker.mjs).
        if (Number.isInteger(poeng?.get(k))) sak.nyhetsverdi = poeng.get(k);
        // Standart süzgeci: yazılmadan hemen önce. Kırmızı: yazılmaz, motor kaydı 'elendi'. Hata: bekler.
        // Kaynağa fazla yakın metin bir kez kendi cümleleriyle yeniden yazılır (kapı yeni metni baştan denetler).
        let omskrevetSak = null;
        const omskriv = async (s) => {
          const utdrag = s.kirmizi.map((b) => b.ham).filter((h) => h && !h.startsWith('oran '));
          omskrevetSak = await B.omskrivNærKilde(sak, sak.kildeTekst ?? '', utdrag, { medier: sak.produksjon === 'ki-medier' });
          return omskrevetSak && sakDenetimGirdisi({ ...sak, ...omskrevetSak });
        };
        const kapi = await B.yayinKapisi({ girdi: sakDenetimGirdisi(sak), kimlik: k.id, log: standartLogg, ikinci: ikinciKapi, omskriv });
        if (kapi.omskrevet) {
          Object.assign(sak, omskrevetSak);
          log(`  ~ ${k.id}: skrevet om (for nær kilden)`);
        }
        if (kapi.karar === 'bekle') {
          log(`  - ${k.id}: venter (standartkontroll feilet: ${kapi.hata})`);
          ozet.ventListe.push(`${etikett(k)}: standartkontroll feilet, ${kapi.hata}`);
          continue;
        }
        if (kapi.karar === 'elendi') {
          merkSett(k);
          log(`  - ${k.id}: droppet (${kapi.s.gerekce})`);
          ozet.standartElendi.push(`${etikett(k)}: ${kapi.s.gerekce}`);
          elendi(k, kapi.s.gerekce);
          continue;
        }
        // Sarı ve turuncu farevarsel tek haber olmaz: tur sonunda günün "Farevarsler" sayfasına bölüm olur (bkz. farevarsler.mjs).
        if (varselSidesine(sak)) {
          // 29.10.2026'dan beri günlük derleme kapalı: uyarı /farevarsler/ sayfasının arşivinde (farevarsel-bryter.mjs).
          if (!dagssideAktiv()) {
            merkSett(k);
            delete tilstand.feil[k.id];
            log(`  ~ ${k.id}: dekkes av /farevarsler/`);
            elendi(k, 'farevarsel: dekkes av /farevarsler/ (dagsside av)');
            continue;
          }
          const varselSlug = varselSlugFor(new Date());
          const varselGerekce = yazimGerekcesi(kapi);
          if (kapi.s.karar === 'sari' || varselGerekce) await B.motorKaydet({ site: 'tidsrost', kayit: sariKayit(k.id, varselSlug, { gerekce: varselGerekce }) });
          ozet.varselListe.push({ k, sak });
          hukommelse.push(nokkel({ slug: varselSlug, tittel: sak.title, ingress: sak.description, tekst: sak.body, tid: Date.now(), produksjon: sak.produksjon }));
          merkSett(k);
          delete tilstand.feil[k.id];
          log(`  ~ ${k.id}: Farevarsler`);
          yazildi(k, varselSlug);
          continue;
        }
        const slug = await B.skrivSak(A.rot, sak);
        const yazGerekce = yazimGerekcesi(kapi);
        if (kapi.s.karar === 'sari' || yazGerekce) await B.motorKaydet({ site: 'tidsrost', kayit: sariKayit(k.id, slug, { gerekce: yazGerekce }) });
        if (!sak.draft) hukommelse.push(nokkel({ slug, tittel: sak.title, ingress: sak.description, tekst: sak.body, tid: Date.now(), produksjon: sak.produksjon }));
        merkSett(k);
        delete tilstand.feil[k.id];
        ozet.antall++;
        geminiKesintisi = 0;
        log(`  + ${slug}${sak.draft ? ' (utkast)' : ''}`);
        yazildi(k, slug);
        if (sak.stopp?.length) ozet.stoppListe.push(`${sak.title} — ${rens(k, sak.stopp.join(' / '))}`);
        else if (sak.draft) ozet.utkastListe.push(`${sak.title}${sak.merknader?.length ? ` — ${rens(k, sak.merknader.join(' / '))}` : ''}`);
        else if (sak.merknader?.length) ozet.rettetListe.push(`${sak.title} — ${rens(k, sak.merknader.join(' / '))}`);
      } catch (e) {
        // Hata mesajı durum dosyasına da yazılır; loglara bakmadan görülebilsin.
        const melding = rens(k, `${e.message}${e.cause ? ` (${e.cause.message ?? e.cause})` : ''}`).slice(0, 500);
        ozet.feilListe.push(`${k.id}: ${melding}`);
        console.error(`  ! ${k.id}: ${melding}`);
        if (e.ayar) {
          ayarHatasi = e;
          break;
        }
        const forrige = tilstand.feil[k.id];
        const tidligere = typeof forrige === 'number' ? forrige : forrige?.antall ?? 0;
        const ant = e.konfig ? tidligere : tidligere + 1;
        tilstand.feil[k.id] = { antall: ant, melding, tid: zaman() };
        if (ant >= MAKS_FEIL) {
          delete tilstand.feil[k.id];
          ele(k, 'üç denemede yazılamadı');
        } else {
          uyeler(k).forEach((kimlik) => koy({ kimlik, durum: 'bekliyor', hata: new Error(temiz(melding)), ...(e.konfig && { sayilmaz: true }) }));
        }
        // Google tümüyle kapalıyken her aday 2 deneme × 45 sn bekleyip düşüyordu: arka arkaya ikinci kesintide tur erken
        // biter, kalan adaylar sonraki tura kalır.
        if (/çok fazla deneme/.test(e.message)) {
          if (++geminiKesintisi >= 2) {
            log('\nGemini svarer ikke; resten av sakene spares til neste kjøring.');
            break;
          }
        } else geminiKesintisi = 0;
      }
    }

    // Kısa resmi duyurular günün tek "Kort fortalt" sayfasına eklenir (turu durduran hatadan önce de yazılır).
    // Sayfa değiştiyse yayın tetiklensin diye sayıma bir olarak girer (iş akışı antall=0 iken derleme yapmaz).
    let kortHatasi = null;
    if (!A.torr && ozet.kortListe.length) {
      try {
        ozet.kortLagt = await B.leggTilKortFortalt(A.rot, ozet.kortListe.map((x) => x.kort));
        log(`  + Kort fortalt: ${ozet.kortLagt} nye linjer`);
        if (ozet.kortLagt) ozet.antall++;
      } catch (e) {
        // Sayfa yazılamadı: satırlar yazıldı sayılmaz, sonraki turda yeniden denenir.
        kortHatasi = e;
        for (const { k } of ozet.kortListe) {
          for (const id of k.ider ?? [k.id]) delete tilstand.sett[id];
          uyeler(k).forEach((kimlik) => koy({ kimlik, durum: 'bekliyor', hata: new Error(temiz(e.message)) }));
        }
      }
    }

    // Farevarsler sayfası da Kort fortalt gibi tur sonunda yazılır; değiştiyse yayın sayımına bir olarak girer.
    let varselHatasi = null;
    if (!A.torr && ozet.varselListe.length) {
      try {
        const lagt = await B.leggTilFarevarsler(A.rot, ozet.varselListe.map(({ k, sak }) => ({ id: k.id, sak })));
        log(`  + Farevarsler: ${lagt} nye eller oppdaterte varsler`);
        if (lagt) ozet.antall++;
      } catch (e) {
        // Sayfa yazılamadı: uyarılar yazıldı sayılmaz, sonraki turda yeniden denenir.
        varselHatasi = e;
        for (const { k } of ozet.varselListe) {
          for (const id of k.ider ?? [k.id]) delete tilstand.sett[id];
          uyeler(k).forEach((kimlik) => koy({ kimlik, durum: 'bekliyor', hata: new Error(temiz(e.message)) }));
        }
      }
    }

    const durdurucu = ayarHatasi ?? kortHatasi ?? varselHatasi;
    if (durdurucu) {
      durdurucu.sonuclar = sonuclar;
      throw durdurucu;
    }
    return sonuclar;
  }

  return { adaylar, isle, ozet, simdi };
}

/**
 * Motor yokken yerel tur: tüm taze adaylar işlenir; karar verilen her üye isle içinde sett'e işaretlenir, bekleyenler
 * (puanlanamayan, onay ya da denetim alınamayan, payı dolan) işaretlenmez. Bugünkü davranışın aynısı.
 * Turu durduran hata ayarHatasi olarak döner (eskiden de durum yine yazılırdı).
 */
export async function yerelTur(uyarlayici, tilstand, { log } = {}) {
  const hepsi = await uyarlayici.adaylar({ log });
  let sonuclar;
  let ayarHatasi = null;
  try {
    sonuclar = await uyarlayici.isle(hepsi, { log });
  } catch (e) {
    if (!Array.isArray(e?.sonuclar)) throw e;
    sonuclar = e.sonuclar;
    ayarHatasi = e;
  }
  return { sonuclar, ayarHatasi };
}

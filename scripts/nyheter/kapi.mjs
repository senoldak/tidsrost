// Standartlar Faz 0: yayın kapısı. Haberin son metni hazır olunca, dosya yazılmadan hemen önce çağrılır.
//   kırmızı -> yazılmaz, motor kaydı 'elendi' + gerekçe; denetim hatası -> bekle (havuzda kalır); sarı -> yazılır.
import { standartDenetle, standartOzeti, yayinDurduMu } from './standart.mjs';
import { motorKaydet, kirmiziKayit } from './motor.mjs';

// Acil durdurma: tur başında, Gemini'ye ilk çağrıdan önce. Döner: true ise tur hiçbir şey yazmadan bitmeli.
export async function acilDurdurma({ ortam = process.env, fetchFn, log = console.log } = {}) {
  const r = await yayinDurduMu({ url: ortam.MOTOR_URL, anahtar: ortam.MOTOR_ANAHTARI, site: 'tidsrost', ...(fetchFn && { fetchFn }) });
  if (r.durdu) {
    log(`Acil durdurma açık: ${r.neden}`);
    return true;
  }
  log(`Acil durdurma: ${r.neden}`);
  return false;
}

// Haber alanları okura görünen her yer: why_matters ve key_points ek alandır.
export function sakDenetimGirdisi(sak) {
  return {
    dil: 'nb',
    baslik: sak.title ?? '',
    ozet: sak.description ?? '',
    metin: sak.body ?? '',
    ekler: [sak.why_matters, ...(Array.isArray(sak.key_points) ? sak.key_points : [])].filter(Boolean),
    kaynakMetni: sak.kildeTekst ?? '',
  };
}

/**
 * Döner: { karar: 'yaz' | 'elendi' | 'bekle', s, hata }.
 *   'yaz': temiz ya da sarı (s.karar sarıysa çağıran yazıldı kaydına s.gerekce ekler).
 *   'elendi': kırmızı; kayıt zaten motora yazıldı.
 *   'bekle': denetim çalışamadı; haber bu tur yayımlanmaz, motor kaydı bekliyor kalır (hiçbir şey yazılmaz).
 */
//   ikinci (isteğe bağlı): ortak kapının ikinci okuması; belirlenimci süzgeç kırmızı değilse sorulur.
//   'elendi' kırmızıyla aynı yol; 'bekle' haberi havuzda tutar; 'gec' -> 'yaz' + kapiGerekce. Ayar hatası yukarı fırlar.
//   omskriv (isteğe bağlı): kırmızının tek nedeni kaynak-benzerligi ise bir kez çağrılır (s -> yeni girdi | null);
//   yeni girdi süzgeçten baştan geçer, yine kırmızıysa eskisi gibi elenir. Yeniden yazma hatası da eler.
//   Yeniden yazıldıysa dönen nesnede omskrevet: true (çağıran yeni metni yazar).
export async function yayinKapisi({ girdi, kimlik, ortam = process.env, denetle = standartDenetle, kaydet = motorKaydet, log = console.log, ikinci = null, omskriv = null }) {
  let s;
  let omskrevet = false;
  const kontrol = (g) => {
    const r = denetle(g);
    if (!r || !['temiz', 'sari', 'kirmizi'].includes(r.karar)) throw new Error('standart denetimi geçersiz sonuç döndürdü');
    return r;
  };
  try {
    s = kontrol(girdi);
  } catch (e) {
    return { karar: 'bekle', hata: String(e?.message ?? e).slice(0, 200) };
  }
  if (s.karar === 'kirmizi' && typeof omskriv === 'function' && s.kirmizi?.length && s.kirmizi.every((b) => b.kural === 'kaynak-benzerligi')) {
    log(`  ${standartOzeti(s)}; skrives om én gang`);
    let ny = null;
    try {
      ny = await omskriv(s);
    } catch (e) {
      log(`  omskriving feilet: ${String(e?.message ?? e).slice(0, 200)}`);
    }
    if (ny) {
      try {
        const s2 = kontrol(ny);
        girdi = ny;
        s = s2;
        omskrevet = true;
      } catch (e) {
        return { karar: 'bekle', hata: String(e?.message ?? e).slice(0, 200) };
      }
    }
  }
  const sonuc = await kapiDevam({ girdi, kimlik, ortam, kaydet, log, ikinci, s });
  return { ...sonuc, ...(omskrevet && { omskrevet }) };
}

async function kapiDevam({ girdi, kimlik, ortam, kaydet, log, ikinci, s }) {
  if (s.karar === 'kirmizi') {
    log(`  ${standartOzeti(s)}`);
    await kaydet({ url: ortam.MOTOR_URL, anahtar: ortam.MOTOR_ANAHTARI, site: 'tidsrost', kayit: kirmiziKayit(kimlik, s) });
    return { karar: 'elendi', s };
  }
  if (s.karar === 'sari') log(`  ${standartOzeti(s)}`);
  if (typeof ikinci === 'function') {
    const r = await ikinci([girdi]);
    if (r.karar === 'elendi') {
      const es = { ...s, gerekce: r.gerekce };
      await kaydet({ url: ortam.MOTOR_URL, anahtar: ortam.MOTOR_ANAHTARI, site: 'tidsrost', kayit: kirmiziKayit(kimlik, es) });
      return { karar: 'elendi', s: es };
    }
    if (r.karar === 'bekle') return { karar: 'bekle', hata: r.hata };
    return { karar: 'yaz', s, kapiGerekce: r.gerekce };
  }
  return { karar: 'yaz', s };
}

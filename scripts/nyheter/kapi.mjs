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
export async function yayinKapisi({ girdi, kimlik, ortam = process.env, denetle = standartDenetle, kaydet = motorKaydet, log = console.log }) {
  let s;
  try {
    s = denetle(girdi);
    if (!s || !['temiz', 'sari', 'kirmizi'].includes(s.karar)) throw new Error('standart denetimi geçersiz sonuç döndürdü');
  } catch (e) {
    return { karar: 'bekle', hata: String(e?.message ?? e).slice(0, 200) };
  }
  if (s.karar === 'kirmizi') {
    log(`  ${standartOzeti(s)}`);
    await kaydet({ url: ortam.MOTOR_URL, anahtar: ortam.MOTOR_ANAHTARI, site: 'tidsrost', kayit: kirmiziKayit(kimlik, s) });
    return { karar: 'elendi', s };
  }
  if (s.karar === 'sari') log(`  ${standartOzeti(s)}`);
  return { karar: 'yaz', s };
}

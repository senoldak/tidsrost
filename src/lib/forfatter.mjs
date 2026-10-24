// Yazar kuralı (sahibi, 24 Ekim): kişi imzası yalnız özel yazılarda (Forklart ve Analyse);
// bot haberleri, bültenler ve derlemeler dahil geri kalan her şeyde yazar site adıdır.
export const REDAKTOR_NAVN = 'Şenol Dak';

export const erSpesialSjanger = (sjanger) => sjanger === 'forklart' || sjanger === 'analyse';

// Görünen yazar. Özel yazıda kişi (ön bilgideki kişi adı, yoksa ya da site adıysa redaktör), değilse site adı.
export function synligForfatter({ sjanger, author } = {}, siteNavn, redaktor = REDAKTOR_NAVN) {
  if (!erSpesialSjanger(sjanger)) return siteNavn;
  return author && author !== siteNavn ? author : redaktor;
}

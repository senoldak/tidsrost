// Norveç harfli adlardan URL slug'ı: ø→o, æ→ae, å→a, diğer aksanlar NFD ile atılır.
// Harf/rakam dışındaki her şey tek tireye iner; baş ve sonda tire kalmaz.

/** 'Våler (Østfold)' → 'valer-ostfold' */
export function lagSlug(tekst) {
  return String(tekst)
    .toLowerCase()
    .replace(/ø/g, 'o')
    .replace(/æ/g, 'ae')
    .replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

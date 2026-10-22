// <script type="application/ld+json" set:html={...}> için JSON metni. set:html içeriği kaçırmaz; JSON.stringify de
// "<" ve ">" karakterlerine dokunmaz, bu yüzden başlıktaki bir "</script>" öğeyi bitirip kalanını HTML yapardı.
// Bu karakterler ve U+2028/U+2029 satır ayırıcıları \uXXXX yazılır: çıktı aynı değeri veren geçerli JSON olarak kalır.
const KACIRILAN = ['<', '>', '&', String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
const KACIS = Object.fromEntries(KACIRILAN.map((c) => [c, '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')]));
const DESEN = new RegExp(`[${KACIRILAN.join('')}]`, 'g');

export function jsonLdMetni(veri) {
  return JSON.stringify(veri).replace(DESEN, (c) => KACIS[c]);
}

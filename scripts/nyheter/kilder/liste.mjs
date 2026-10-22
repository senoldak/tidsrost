// Haber botunun kaynak listesi (sıra önemlidir: velg kaynaklar arasında bu sırayla döner).
import regjeringen from './regjeringen.mjs';
import norgesbank from './norgesbank.mjs';
import met from './met.mjs';
import nve from './nve.mjs';
import stortinget from './stortinget.mjs';
import medier from './medier.mjs';
import { ssb, nkom, mattilsynet, datatilsynet, kulturdirektoratet, norgesbankPresse, finanstilsynet, konkurransetilsynet, skatteetaten,
  vegvesen, fhi, dsb, havforskning, sivilombudet, forbrukerradet, idrettsforbundet, norfund,
  unnews, eukommisjonen, statnett, arbeidstilsynet, kystverket, helsedirektoratet, miljodirektoratet } from './etater.mjs';

// UDI (kilder/udi.mjs) listede yok: udi.no Azure WAF bot denetimiyle veri merkezi IP'lerini kesiyor (GitHub Actions ve
// Cloudflare çıkışı 403, 2026-10-17); API ya da açık veri kaydı yok. UDI erişim izni verirse geri eklenir.
// medier: haber siteleri, en az iki sitede çıkan olaylar (bkz. kilder/medier.mjs).
export const KILDER = [medier, norgesbank, met, nve, stortinget, regjeringen, ssb, nkom, mattilsynet, datatilsynet, kulturdirektoratet, norgesbankPresse, finanstilsynet, konkurransetilsynet, skatteetaten,
  vegvesen, fhi, dsb, havforskning, sivilombudet, forbrukerradet, idrettsforbundet, norfund,
  unnews, eukommisjonen, statnett, arbeidstilsynet, kystverket, helsedirektoratet, miljodirektoratet];

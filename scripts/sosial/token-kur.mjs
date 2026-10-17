// Bir kerelik kurulum: Graph API Gezgini'nden alınıp 60 güne uzatılan kullanıcı token'ından Sayfanın süresiz
// token'ını ve bağlı Instagram hesabının kimliğini bulur, GitHub'a yazar (gizli META_TOKEN, değişkenler META_PAGE_ID,
// INSTAGRAM_USER_ID). Token ekrana yazılmaz; yapıştırırken de görünmez.
// Kullanım (terminalde): node scripts/sosial/token-kur.mjs <sayfa-adı> <owner/repo>
//   ör. node scripts/sosial/token-kur.mjs Tidsrøst senoldak/tidsrost
import { execFileSync } from 'node:child_process';
import readline from 'node:readline';

const [sayfaAdi, repo] = process.argv.slice(2);
if (!sayfaAdi || !repo) {
  console.error('Kullanım: node scripts/sosial/token-kur.mjs <sayfa-adı> <owner/repo>');
  process.exit(1);
}
const API = 'https://graph.facebook.com/v25.0';

function gizliOku(soru) {
  return new Promise((coz) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.startsWith(soru)) process.stdout.write(s); };
    rl.question(soru, (cevap) => { rl.close(); process.stdout.write('\n'); coz(cevap.trim()); });
  });
}
async function graph(yol, alanlar) {
  const res = await fetch(`${API}/${yol}?${new URLSearchParams(alanlar)}`);
  const v = await res.json();
  if (!res.ok || v.error) throw new Error(v.error?.message ?? `HTTP ${res.status}`);
  return v;
}

const kullaniciToken = await gizliOku('Uzatılmış kullanıcı token\'ını yapıştırıp Enter\'a bas (görünmez): ');
const { data: sayfalar } = await graph('me/accounts', { fields: 'id,name,access_token,instagram_business_account{id,username}', access_token: kullaniciToken, limit: '200' });
const sayfa = sayfalar.find((s) => s.name.toLocaleLowerCase('nb') === sayfaAdi.toLocaleLowerCase('nb'));
if (!sayfa) throw new Error(`"${sayfaAdi}" bulunamadı. Token'ın erişebildiği Sayfalar: ${sayfalar.map((s) => s.name).join(', ')}`);
if (!sayfa.instagram_business_account) throw new Error(`${sayfa.name} Sayfasına bağlı Instagram profesyonel hesabı yok.`);

// Süresiz mi? Uzatılmış kullanıcı token'ından gelen Sayfa token'ı süresizdir (expires_at 0).
const { data: bilgi } = await graph('debug_token', { input_token: sayfa.access_token, access_token: sayfa.access_token });
const sure = bilgi?.expires_at ? new Date(bilgi.expires_at * 1000).toISOString() : 'süresiz';

execFileSync('gh', ['secret', 'set', 'META_TOKEN', '--repo', repo], { input: sayfa.access_token, stdio: ['pipe', 'inherit', 'inherit'] });
execFileSync('gh', ['variable', 'set', 'META_PAGE_ID', '--repo', repo, '--body', sayfa.id], { stdio: 'inherit' });
execFileSync('gh', ['variable', 'set', 'INSTAGRAM_USER_ID', '--repo', repo, '--body', sayfa.instagram_business_account.id], { stdio: 'inherit' });
console.log(`Tamam: ${sayfa.name} (Sayfa ${sayfa.id}), Instagram @${sayfa.instagram_business_account.username} (${sayfa.instagram_business_account.id}); Sayfa token'ı: ${sure}.`);

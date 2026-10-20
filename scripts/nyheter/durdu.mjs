// Standartlar: iş akışı adımı. Acil durdurma açıksa GITHUB_OUTPUT'a durdu=1 yazar; sonraki adımlar buna bakar.
import { appendFile } from 'node:fs/promises';
import { yayinDurduMu } from './standart.mjs';

const dur = await yayinDurduMu({ url: process.env.MOTOR_URL, anahtar: process.env.MOTOR_ANAHTARI, site: 'tidsrost' });
console.log(dur.durdu ? `Acil durdurma açık: ${dur.neden}` : `Acil durdurma kontrolü: ${dur.neden}`);
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `durdu=${dur.durdu ? 1 : 0}\n`);

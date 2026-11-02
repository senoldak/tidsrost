import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './index.js';

const sahte = () => {
  const kayit = [];
  const sorulan = [];
  return {
    kayit,
    sorulan,
    env: {
      ASSETS: {
        fetch: async (r) => {
          const yol = new URL(r.url).pathname;
          sorulan.push(yol);
          return new Response('sayfa', { status: yol === '/artikkel/var/' || !yol.startsWith('/artikkel/') ? 200 : 404 });
        },
      },
      DB: { prepare: (sql) => ({ bind: (...a) => ({ run: async () => kayit.push({ sql, a }) }) }) },
    },
  };
};
const post = (govde) => new Request('https://ornek.example/api/nyttig', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: govde });

test('Worker: yalnız yayımlanmış sayfası olan yazı sayılır', async () => {
  const { env, kayit, sorulan } = sahte();
  assert.equal((await worker.fetch(post('{"slug":"uydurma","svar":"ja"}'), env)).status, 404);
  assert.equal(kayit.filter((k) => /INSERT/.test(k.sql)).length, 0);
  assert.equal((await worker.fetch(post('{"slug":"var","svar":"ja"}'), env)).status, 204);
  assert.equal(kayit.filter((k) => /INSERT/.test(k.sql)).length, 1);
  assert.deepEqual(sorulan, ['/artikkel/uydurma/', '/artikkel/var/']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { safeStorage } from './safe-storage.ts';

test('safeStorage: fungerer i Node/SSR uten window ved bruk av Map-lager', () => {
  safeStorage.clear();
  assert.equal(safeStorage.getItem('nokkel'), null);
  safeStorage.setItem('nokkel', 'verdi1');
  assert.equal(safeStorage.getItem('nokkel'), 'verdi1');
  safeStorage.removeItem('nokkel');
  assert.equal(safeStorage.getItem('nokkel'), null);
});

test('safeStorage: fanger SecurityError og faller tilbake på Map', () => {
  const kast = () => {
    throw new Error('SecurityError: The operation is insecure.');
  };

  (globalThis as any).window = {
    get localStorage() {
      return {
        getItem: kast,
        setItem: kast,
        removeItem: kast,
        clear: kast,
      };
    },
  };

  try {
    safeStorage.clear();
    assert.doesNotThrow(() => {
      safeStorage.setItem('valg', 'mork');
    });
    assert.equal(safeStorage.getItem('valg'), 'mork');
    safeStorage.removeItem('valg');
    assert.equal(safeStorage.getItem('valg'), null);
  } finally {
    delete (globalThis as any).window;
  }
});

test('safeStorage: Safari Privat modus (setItem feiler med kvote, getItem gir null) lagrer og leser i minne', () => {
  (globalThis as any).window = {
    localStorage: {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError: The quota has been exceeded.');
      },
      removeItem: () => {},
      clear: () => {},
    },
  };

  try {
    safeStorage.clear();
    assert.doesNotThrow(() => {
      safeStorage.setItem('tema', 'mork');
    });
    assert.equal(safeStorage.getItem('tema'), 'mork');
    safeStorage.removeItem('tema');
    assert.equal(safeStorage.getItem('tema'), null);
  } finally {
    delete (globalThis as any).window;
  }
});

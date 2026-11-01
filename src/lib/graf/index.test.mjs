import test from 'node:test';
import assert from 'node:assert/strict';
import { FORMER } from './index.mjs';
import { BILINEN_FORMER } from './sema.mjs';

test('kayıt: FORMER ve BILINEN_FORMER aynı', () => assert.deepEqual(Object.keys(FORMER).sort(), [...BILINEN_FORMER].sort()));

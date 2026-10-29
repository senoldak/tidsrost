import { test } from 'node:test';
import assert from 'node:assert/strict';
import { koyuMediaSil } from './svg-lys.mjs';

test('koyuMediaSil: grafikkens mørke @media-blokk fjernes, lyse regler blir', () => {
  const svg = '<svg><style>.f-zemin{fill:#fdfdfb}.s-cizgi{stroke:#dcded8}@media (prefers-color-scheme: dark){.f-zemin{fill:#171612}.s-cizgi{stroke:#33312b}}</style><rect class="f-zemin"/></svg>';
  assert.equal(koyuMediaSil(svg), '<svg><style>.f-zemin{fill:#fdfdfb}.s-cizgi{stroke:#dcded8}</style><rect class="f-zemin"/></svg>');
});

test('koyuMediaSil: variant uten mellomrom og fil uten blokk', () => {
  assert.equal(koyuMediaSil('<style>a{x:1}@media (prefers-color-scheme:dark){a{x:2}}</style>'), '<style>a{x:1}</style>');
  assert.equal(koyuMediaSil('<svg><rect/></svg>'), '<svg><rect/></svg>');
});

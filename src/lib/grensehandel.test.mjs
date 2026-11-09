import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  beregnGrensehandel,
  STANDARD_KURS,
  STEDER_PRESETS
} from './grensehandel.mjs';

test('beregnGrensehandel: gir positiv netto besparelse ved vanlig handletur', () => {
  // 3000 SEK handlekurv fra Oslo til Svinesund (120 km)
  const res = beregnGrensehandel({
    varekurv: {
      dagligvarerSek: 1000,
      kjottSek: 800,
      godteriSek: 400,
      snusSek: 800,
      alkoholSek: 0
    },
    kursNokPer100Sek: 98,
    avstandEnVeiKm: 120,
    drivstoff: 'bensin',
    drivstoffPris: 21,
    forbrukPerMil: 0.65,
    bompengerTurRetur: 60,
    oppholdstimer: 5
  });

  assert.equal(res.totaltSek, 3000);
  assert.equal(res.varekostnadNok, 2940); // 3000 * 0.98
  assert.ok(res.estimertNorgeNok > res.varekostnadNok);
  assert.ok(res.bruttoSparingNok > 1000);
  assert.ok(res.reisekostnadNok > 300); // 24 mil * 0.65 * 21 + 60 = 327.6 + 60 = 387.6
  assert.ok(res.nettoSparingNok > 0);
  assert.equal(res.lonnsom, true);
  assert.equal(res.kvoteStatus.verdigrenseOverskredet, false); // 2940 < 3000
});

test('beregnGrensehandel: varsler når tollkvote (verdigrense 3000 kr under 24t) overskrides', () => {
  const res = beregnGrensehandel({
    varekurv: {
      dagligvarerSek: 4000,
      kjottSek: 0,
      godteriSek: 0,
      snusSek: 0,
      alkoholSek: 0
    },
    kursNokPer100Sek: 100,
    avstandEnVeiKm: 30,
    drivstoff: 'elbil',
    drivstoffPris: 2.5,
    forbrukPerMil: 2.0,
    bompengerTurRetur: 0,
    oppholdstimer: 4
  });

  assert.equal(res.varekostnadNok, 4000);
  assert.equal(res.kvoteStatus.verdigrenseNok, 3000);
  assert.equal(res.kvoteStatus.verdigrenseOverskredet, true);
});

test('beregnGrensehandel: tillater 6000 kr verdigrense ved over 24 timers opphold', () => {
  const res = beregnGrensehandel({
    varekurv: {
      dagligvarerSek: 5000,
      kjottSek: 0,
      godteriSek: 0,
      snusSek: 0,
      alkoholSek: 0
    },
    kursNokPer100Sek: 100,
    avstandEnVeiKm: 30,
    drivstoff: 'elbil',
    drivstoffPris: 2.5,
    forbrukPerMil: 2.0,
    bompengerTurRetur: 0,
    oppholdstimer: 25 // > 24 timer
  });

  assert.equal(res.kvoteStatus.verdigrenseNok, 6000);
  assert.equal(res.kvoteStatus.verdigrenseOverskredet, false);
});

test('beregnGrensehandel: beregner break-even nullpunkt når reisen er dyr og handlekurven liten', () => {
  const res = beregnGrensehandel({
    varekurv: {
      dagligvarerSek: 200,
      kjottSek: 0,
      godteriSek: 0,
      snusSek: 0,
      alkoholSek: 0
    },
    kursNokPer100Sek: 100,
    avstandEnVeiKm: 150,
    drivstoff: 'bensin',
    drivstoffPris: 22,
    forbrukPerMil: 0.7,
    bompengerTurRetur: 80,
    oppholdstimer: 4
  });

  // Reisekostnad: 30 mil * 0.7 * 22 + 80 = 462 + 80 = 542 kr
  // Gevinst på 200 kr dagligvarer er ca 60 kr -> netto tap
  assert.equal(res.lonnsom, false);
  assert.ok(res.nettoSparingNok < 0);
  assert.ok(res.nullpunktSek > 1500);
});

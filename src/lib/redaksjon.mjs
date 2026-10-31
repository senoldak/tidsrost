// Redaksjonen: agentregister, trinn per sakstype og faktalinje for «Slik ble saken laget».
// Navn, roller og utseende er de samme som i redaksjonsspillet. Agentnavn er navn på automatiske trinn, ikke på mennesker.

export const AGENTER = {
  sigrid: { navn: 'Sigrid', rolle: 'Speider', ki: true, u: { sac: 'uzun', sacRenk: '#e2c26a', ten: '#f2cfb0', ust: '#1f5f99', ustGolge: '#174a78' } },
  vidar: { navn: 'Vidar', rolle: 'Vekter', ki: true, u: { sac: 'kisa', sakal: true, sacRenk: '#6b4226', ten: '#e3b48f', ust: '#a0643c', ustGolge: '#86512f' } },
  ingrid: { navn: 'Ingrid', rolle: 'Skriver', ki: true, u: { sac: 'topuz', sacRenk: '#b5482a', ten: '#f5d4ba', ust: '#c8281e', ustGolge: '#a11f17', gozluk: true } },
  leif: { navn: 'Leif', rolle: 'Vaktsjef', ki: true, u: { sac: 'kel', sakal: true, sacRenk: '#b8b8b0', ten: '#efc9a8', ust: '#24557f', ustGolge: '#1c4466', gozluk: true } },
  kari: { navn: 'Kari', rolle: 'Kontrollør', ki: true, u: { sac: 'kivircik', sacRenk: '#1f1611', ten: '#8d5a3b', ust: '#5a6168', ustGolge: '#474d53' } },
  tor: { navn: 'Tor', rolle: 'Tegner', ki: true, u: { sac: 'kakul', sacRenk: '#16191c', ten: '#d2a079', ust: '#f6d23a', ustGolge: '#d8b52a', alt: '#1f5f99' } },
  dina: { navn: 'Dina', rolle: 'Deler', ki: true, u: { sac: 'atkuyrugu', sacRenk: '#2a1c14', ten: '#a8714e', ust: '#0d3557', ustGolge: '#0a2944' } },
  astrid: { navn: 'Astrid', rolle: 'Redaktør', ki: true, u: { sac: 'kisa', sacRenk: '#8a8a82', ten: '#f0cdb2', ust: '#0d3557', ceket: '#0d3557' } },
  bjorn: { navn: 'Bjørn', rolle: 'Researcher', ki: true, u: { sac: 'kivircik', sacRenk: '#a0643c', ten: '#f2cfb0', ust: '#5a6168', sakal: true } },
  elin: { navn: 'Elin', rolle: 'Skribent', ki: true, u: { sac: 'uzun', sacRenk: '#3b2a1f', ten: '#c98e66', ust: '#c8281e', ustGolge: '#a11f17' } },
  fredrik: { navn: 'Fredrik', rolle: 'Faktasjekker', ki: true, u: { sac: 'kisa', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#24557f', gozluk: true } },
  grete: { navn: 'Grete', rolle: 'Grafikk', ki: true, u: { sac: 'topuz', sacRenk: '#16191c', ten: '#8d5a3b', ust: '#f6d23a', ustGolge: '#d8b52a' } },
  henrik: { navn: 'Henrik', rolle: 'Desk', ki: true, u: { sac: 'kel', sacRenk: '#3b2a1f', ten: '#e3b48f', ust: '#1f5f99', ceket: '#2d3135' } },
  silje: { navn: 'Silje', rolle: 'Språkvakt', ki: true, u: { sac: 'atkuyrugu', sacRenk: '#b5482a', ten: '#f2cfb0', ust: '#a0643c', ustGolge: '#86512f' } },
  jonas: { navn: 'Jonas', rolle: 'Jurist', ki: true, u: { sac: 'kisa', sacRenk: '#16191c', ten: '#d2a079', ust: '#fdfdfb', ceket: '#16191c', gozluk: true } },
  marte: { navn: 'Marte', rolle: 'Nyhetsredaktør', ki: true, u: { sac: 'uzun', sacRenk: '#6b4226', ten: '#f0cdb2', ust: '#0d3557', ceket: '#c8281e' } },
  oskar: { navn: 'Oskar', rolle: 'Oversetter', ki: true, u: { sac: 'kakul', sacRenk: '#6b4226', ten: '#f2cfb0', ust: '#3f7a4a', ustGolge: '#336540' } },
  liv: { navn: 'Liv', rolle: 'Språkvasker', ki: true, u: { sac: 'uzun', sacRenk: '#e2c26a', ten: '#f5d4ba', ust: '#a0643c', gozluk: true } },
  ola: { navn: 'Ola', rolle: 'Driftsvakt', ki: true, u: { sac: 'kisa', sacRenk: '#b5482a', ten: '#f2cfb0', ust: '#3d4247', ustGolge: '#2d3135', sakal: true } },
  nils: { navn: 'Nils', rolle: 'Drift', ki: true, u: { sac: 'kivircik', sacRenk: '#16191c', ten: '#a8714e', ust: '#1f5f99', gozluk: true } },
  senol: { navn: 'Şenol Dak', rolle: 'Journalist', ki: false, u: { sac: 'kisa', sacRenk: '#2b211b', ten: '#e6bc96', ust: '#fdfdfb', ceket: '#16191c' } },
};

const TALL = { 2: 'to', 3: 'tre', 4: 'fire', 5: 'fem', 6: 'seks', 7: 'sju', 8: 'åtte', 9: 'ni', 10: 'ti' };
const tallOrd = (n) => (n === 1 ? 'ett' : TALL[n] ?? String(n));

const kilderAv = (sak) => (Array.isArray(sak?.kilder) ? sak.kilder.filter((k) => k?.navn) : []);
const harVerdi = (sak) => Number.isFinite(sak?.nyhetsverdi);

// Sjefens egne lange tekster (Forklart/Analyse): Şenol skriver, KI oversetter og språkvasker.
export function erEgenTekst(sak) {
  return /şenol/i.test(String(sak?.author ?? '')) && ['forklart', 'analyse'].includes(sak?.sjanger);
}

const trinn = (id, tekst) => ({ id, tekst });

// Trinn i produksjonen, eller null når saken ikke skal ha «Slik ble saken laget» (manuell/ukjent).
export function stegFor(sak) {
  if (erEgenTekst(sak)) {
    return [
      trinn('senol', 'Skrev teksten og valgte tema, data og vinkling.'),
      trinn('oskar', 'Oversatte teksten til bokmål.'),
      trinn('liv', 'Rettet språket uten å endre innholdet.'),
    ];
  }
  const kilder = kilderAv(sak);
  const p = sak?.produksjon;
  const kontroll = trinn('kari', 'Sjekket sitater, tall og navn mot kildene, og at teksten ikke ligner for mye på dem.');
  if (p === 'ki-medier' || p === 'ki-kontrollert') {
    let funn;
    if (p === 'ki-medier') {
      funn = kilder.length ? `Fant saken hos ${tallOrd(kilder.length)} ${kilder.length === 1 ? 'medium' : 'medier'}.` : 'Fant saken hos flere medier.';
    } else {
      funn = kilder.length ? `Fant meldingen hos ${kilder[0].navn}.` : 'Fant meldingen hos en offentlig kilde.';
    }
    const vekt = harVerdi(sak)
      ? `Ga den nyhetsverdi ${sak.nyhetsverdi} av 100. Saker under 70 blir ikke skrevet.`
      : 'Vurderte om saken var viktig nok.';
    return [
      trinn('sigrid', funn),
      trinn('vidar', vekt),
      trinn('ingrid', 'Skrev teksten ut fra kildene.'),
      trinn('leif', 'Leste teksten og rettet språket.'),
      kontroll,
      trinn('tor', 'Laget forsidebildet.'),
      trinn('dina', 'Publiserte saken.'),
    ];
  }
  if (p === 'automatisk' || p === 'ki-automatisk') {
    return [
      trinn('sigrid', kilder.length ? `Hentet tallene fra ${kilder[0].navn}.` : 'Hentet tallene fra en offentlig kilde.'),
      trinn('ingrid', 'Skrev teksten ut fra tallene.'),
      kontroll,
      trinn('dina', 'Publiserte saken.'),
    ];
  }
  // avventer godkjenning: kjedetrinnene for ki-redigert (ikke Şenols egne tekster) vises først etter sjefens godkjenning.
  if (p === 'ki-redigert') {
    return [
      trinn('astrid', 'Valgte tema og vinkel.'),
      trinn('bjorn', 'Hentet tall og dokumenter fra offentlige kilder.'),
      trinn('elin', 'Skrev utkastet.'),
      trinn('fredrik', 'Sjekket tall og sitater mot kildene.'),
      trinn('henrik', 'Strammet inn teksten.'),
      trinn('grete', 'Laget grafene.'),
      trinn('silje', 'Gikk gjennom språket.'),
      trinn('jonas', 'Vurderte juridisk risiko.'),
      trinn('tor', 'Laget forsidebildet.'),
      trinn('marte', 'Samlet saken for publisering.'),
    ];
  }
  return null;
}

// Kort faktalinje for det lukkede kortet. Deler uten data utelates.
export function faktalinje(sak) {
  if (erEgenTekst(sak)) return ['Skrevet av Şenol Dak', 'Oversatt og språkvasket med KI'];
  const kilder = kilderAv(sak);
  const p = sak?.produksjon;
  const ikkeLest = 'Ikke lest av et menneske';
  if (p === 'ki-medier' || p === 'ki-kontrollert') {
    const ut = [];
    if (kilder.length) ut.push(`${kilder.length} ${kilder.length === 1 ? 'kilde' : 'kilder'}`);
    if (harVerdi(sak)) ut.push(`Nyhetsverdi ${sak.nyhetsverdi}/100`);
    ut.push(ikkeLest);
    return ut;
  }
  if (p === 'automatisk' || p === 'ki-automatisk') {
    return [kilder.length ? `Automatisk fra ${kilder[0].navn}` : 'Automatisk fra en offentlig kilde', ikkeLest];
  }
  return [];
}

// Grensehandelkalkulator: beregner reell gevinst ved svenskehandel (harrytur)
// Basert på SSB grensehandelstatistikk, valutakurs NOK/SEK, reisekostnader og Tolletatens kvoter.

export const STANDARD_KURS = 98.0; // NOK per 100 SEK (0.98 kursfaktor)

// Prisforskjeller Norge vs. Sverige (hvor mye dyrere varene i snitt er i Norge)
// Kilde: SSB, NHO Mat og Drikke, Tillväxtanalys
export const PRISPREMIER_NORGE = {
  dagligvarer: 1.30, // ~30 % dyrere i Norge
  kjott: 1.45,        // ~45 % dyrere i Norge (høyere kjøttpriser/tollvern)
  godteri: 1.50,      // ~50 % dyrere i Norge (sukkeravgift og emballasje)
  snus: 1.50,         // ~50 % dyrere i Norge (norsk tobakksavgift)
  alkohol: 1.35       // ~35 % dyrere i Norge (alkoholavgifter og Vinmonopolet)
};

export const STEDER_PRESETS = [
  { navn: 'Oslo – Svinesund', avstandKm: 120, bompenger: 60 },
  { navn: 'Sarpsborg – Svinesund', avstandKm: 35, bompenger: 30 },
  { navn: 'Fredrikstad – Svinesund', avstandKm: 40, bompenger: 30 },
  { navn: 'Halden – Svinesund', avstandKm: 15, bompenger: 0 },
  { navn: 'Lillestrøm – Charlottenberg', avstandKm: 105, bompenger: 40 },
  { navn: 'Kongsvinger – Charlottenberg', avstandKm: 45, bompenger: 0 },
  { navn: 'Trondheim – Storlien', avstandKm: 105, bompenger: 50 }
];

export function beregnGrensehandel(input) {
  const {
    varekurv = {},
    kursNokPer100Sek = STANDARD_KURS,
    avstandEnVeiKm = 100,
    drivstoff = 'bensin',
    drivstoffPris = 21,
    forbrukPerMil = 0.65,
    bompengerTurRetur = 60,
    oppholdstimer = 4
  } = input;

  const dagligvarerSek = Math.max(0, Number(varekurv.dagligvarerSek) || 0);
  const kjottSek = Math.max(0, Number(varekurv.kjottSek) || 0);
  const godteriSek = Math.max(0, Number(varekurv.godteriSek) || 0);
  const snusSek = Math.max(0, Number(varekurv.snusSek) || 0);
  const alkoholSek = Math.max(0, Number(varekurv.alkoholSek) || 0);

  const totaltSek = dagligvarerSek + kjottSek + godteriSek + snusSek + alkoholSek;
  const kursFaktor = kursNokPer100Sek / 100;

  // Faktisk kostnad i NOK betalt i Sverige
  const varekostnadNok = Math.round(totaltSek * kursFaktor * 100) / 100;

  // Hva tilsvarende varer ville kostet i Norge
  const estimertNorgeNok = Math.round((
    (dagligvarerSek * PRISPREMIER_NORGE.dagligvarer) +
    (kjottSek * PRISPREMIER_NORGE.kjott) +
    (godteriSek * PRISPREMIER_NORGE.godteri) +
    (snusSek * PRISPREMIER_NORGE.snus) +
    (alkoholSek * PRISPREMIER_NORGE.alkohol)
  ) * 100) / 100;

  // Brutto besparelse før reiseutgifter
  const bruttoSparingNok = Math.round((estimertNorgeNok - varekostnadNok) * 100) / 100;

  // Reisekostnad: tur-retur km, 1 mil = 10 km
  const totalKm = avstandEnVeiKm * 2;
  const totalMil = totalKm / 10;
  const drivstoffKostnadNok = totalMil * forbrukPerMil * drivstoffPris;
  const reisekostnadNok = Math.round((drivstoffKostnadNok + bompengerTurRetur) * 100) / 100;

  // Netto gevinst
  const nettoSparingNok = Math.round((bruttoSparingNok - reisekostnadNok) * 100) / 100;
  const lonnsom = nettoSparingNok > 0;

  // Tolletatens verdigrense
  // < 24 timer: 3 000 NOK
  // >= 24 timer: 6 000 NOK
  const verdigrenseNok = oppholdstimer >= 24 ? 6000 : 3000;
  const verdigrenseOverskredet = varekostnadNok > verdigrenseNok;

  // Nullpunkt (break-even handlekurv i SEK for å dekke reisekostnadene)
  // Vektet spareprosent per SEK
  const snittPremie = totaltSek > 0 ? (estimertNorgeNok / totaltSek) : 1.38;
  const sparingPerSek = snittPremie - kursFaktor;
  const nullpunktSek = sparingPerSek > 0 ? Math.round(reisekostnadNok / sparingPerSek) : 0;

  return {
    totaltSek,
    kursFaktor,
    varekostnadNok,
    estimertNorgeNok,
    bruttoSparingNok,
    reisekostnadNok,
    nettoSparingNok,
    lonnsom,
    nullpunktSek,
    kvoteStatus: {
      oppholdstimer,
      verdigrenseNok,
      verdigrenseOverskredet,
      verdidifferanseNok: Math.max(0, Math.round(varekostnadNok - verdigrenseNok))
    }
  };
}

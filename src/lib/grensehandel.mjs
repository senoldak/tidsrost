// Grensehandelkalkulator: beregner reell gevinst ved svenskehandel (harrytur).
// Kilder (kontrollert 25.11.2026): Tolletaten (verdigrense), Norges Bank (valutakurs), Eurostat prisnivåindekser
// (prc_ppp_ind, 2024). Reisekostnader, forbruk og bompenger er forutsetninger.

// NOK per 100 SEK. Norges Bank, 25.11.2026: 95,90 (https://data.norges-bank.no/api/data/EXR/B.SEK.NOK.SP).
export const STANDARD_KURS = 96.0;
export const KURS_DATO = '25. november 2026';

// Prisnivå Norge delt på prisnivå Sverige, samme valuta (Eurostat prc_ppp_ind, PLI EU27=100, 2024).
// Eurostat skiller ikke ut godteri eller snus: godteri og brus bruker «alkoholfrie drikkevarer», snus bruker «tobakk».
export const PRISPREMIER_NORGE = {
  dagligvarer: 1.22, // matvarer: NO 130,6 / SE 106,7
  kjott: 1.32, //       kjøtt: NO 140,0 / SE 106,2
  godteri: 1.33, //     alkoholfrie drikkevarer: NO 139,1 / SE 104,7 (anslag for godteri)
  snus: 2.02, //        tobakk: NO 210,5 / SE 104,0 (snus er ikke skilt ut)
  alkohol: 1.55, //     alkoholholdige drikkevarer: NO 225,8 / SE 145,8
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

  // Hva tilsvarende varer ville kostet i Norge: svensk pris omregnet til NOK, ganget med prisnivåforskjellen.
  const estimertNorgeNok = Math.round((
    (dagligvarerSek * PRISPREMIER_NORGE.dagligvarer) +
    (kjottSek * PRISPREMIER_NORGE.kjott) +
    (godteriSek * PRISPREMIER_NORGE.godteri) +
    (snusSek * PRISPREMIER_NORGE.snus) +
    (alkoholSek * PRISPREMIER_NORGE.alkohol)
  ) * kursFaktor * 100) / 100;

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

  // Tolletatens verdigrense (toll.no/no/handle-i-utlandet/verdigrensa): 24 timer eller mindre 3 000 kr, mer enn 24 timer
  // 6 000 kr. Alkohol og tobakk har egne kvoter og regnes ikke med i verdigrensen.
  const verdigrenseNok = oppholdstimer > 24 ? 6000 : 3000;
  const verdigrenseGrunnlagNok = Math.round((dagligvarerSek + kjottSek + godteriSek) * kursFaktor * 100) / 100;
  const verdigrenseOverskredet = verdigrenseGrunnlagNok > verdigrenseNok;

  // Nullpunkt (break-even handlekurv i SEK for å dekke reisekostnadene)
  // Vektet spareprosent per SEK
  // Uten handlekurv brukes matvarenes prisforskjell.
  const snittPremie = totaltSek > 0 ? estimertNorgeNok / (totaltSek * kursFaktor) : PRISPREMIER_NORGE.dagligvarer;
  const sparingPerSek = kursFaktor * (snittPremie - 1);
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
      verdigrenseGrunnlagNok,
      verdigrenseOverskredet,
      verdidifferanseNok: Math.max(0, Math.round(verdigrenseGrunnlagNok - verdigrenseNok))
    }
  };
}

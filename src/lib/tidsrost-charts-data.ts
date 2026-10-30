// tidsrøst grafikkatalog: 62 interaktive grafikkomponenter for norsk økonomi og samfunn
// BRAND.md-kompatibel: Archivo & Source Serif 4, Fjord-blå (#0d3557), Su mavisi / Vann (#1f5f99),
// Signalrød (#c8281e), N50 høydekurve (#a0643c). Gul farge forbudt (ikke Sverige).

export type GrafikTuru =
  | 'alan'
  | 'sutun'
  | 'yigilmis-sutun'
  | 'ayrisan-cubuk'
  | 'aralik-bant'
  | 'halka-pay'
  | 'radyal-hedef'
  | 'coklu-karma'
  | 'nokta-dagilim'
  | 'siralama-cubuk'
  | 'akis-selale';

export interface Nokta { etiket: string; deger: number; }
export interface Dilim { ad: string; oran: number; renk: 'vann' | 'blekk' | 'signalrod' | 'kontur' | 'gra'; }
export interface AralikNoktasi { etiket: string; min: number; max: number; mevcut: number; }
export interface YigilmisGrup { etiket: string; varlik: number; yukumluluk: number; }
export interface CokluNokta { etiket: string; cubuk: number; cizgi: number; }
export interface SiralamaOgesi { etiket: string; deger: number; }
export interface AkisAdimi { ad: string; deger: number; tur: 'artis' | 'azalis' | 'net'; }
export interface ScatterNokta { x: number; y: number; }

export interface TidsrostGrafikTanimi {
  id: string;
  tur: GrafikTuru;
  kategori: 'MAKROØKONOMI & RENTER' | 'BOLIG & EIENDOM' | 'KRAFT & ENERGI' | 'ARBEIDSLIV & LØNN' | 'OLJEFONDET & BØRS' | 'SAMFUNN & STATISTIKK';
  baslik: string;
  aciklama: string;
  metrik: string;
  degisim: number;
  degisimEtiket: string;
  tarih: string;
  kaynak: string;
  mebiusTitle: string;
  exportName: string;
  mebiusFile: string;
  previewImage: string;
  hoydeKurve?: number;
  kartbladRef?: string;
  seri?: Nokta[];
  dilimler?: Dilim[];
  araliklar?: AralikNoktasi[];
  gruplar?: YigilmisGrup[];
  seriler?: CokluNokta[];
  ogeler?: SiralamaOgesi[];
  adimlari?: AkisAdimi[];
  noktalar?: ScatterNokta[];
  oran?: number;
  hedef?: number;
}

export const TİDSROST_GRAFİKLER: TidsrostGrafikTanimi[] = [
  {
    "id": "charts-total-value",
    "tur": "alan",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Statens pensjonsfond utland (Oljefondet) markedsverdi",
    "aciklama": "Akkumulert markedsverdi for Oljefondets globale aksje-, rente- og eiendomsinvesteringer.",
    "metrik": "19.450 mrd. kr",
    "degisim": 14.8,
    "degisimEtiket": "Årlig verdiendring",
    "tarih": "30. oktober 2026",
    "kaynak": "Norges Bank Investment Management (NBIM)",
    "seri": [
      {
        "etiket": "Nov",
        "deger": 1120
      },
      {
        "etiket": "Des",
        "deger": 1160
      },
      {
        "etiket": "Jan",
        "deger": 1195
      },
      {
        "etiket": "Feb",
        "deger": 1210
      },
      {
        "etiket": "Mar",
        "deger": 1260
      },
      {
        "etiket": "Apr",
        "deger": 1290
      },
      {
        "etiket": "Mai",
        "deger": 1315
      },
      {
        "etiket": "Jun",
        "deger": 1340
      },
      {
        "etiket": "Jul",
        "deger": 1360
      },
      {
        "etiket": "Aug",
        "deger": 1390
      },
      {
        "etiket": "Sep",
        "deger": 1410
      },
      {
        "etiket": "Okt",
        "deger": 1428
      }
    ],
    "mebiusTitle": "Total Value Chart",
    "exportName": "TotalValueChart",
    "mebiusFile": "total-value-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-value.webp",
    "hoydeKurve": 1,
    "kartbladRef": "N50-1900-I"
  },
  {
    "id": "charts-total-expenses",
    "tur": "halka-pay",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Statsbudsjettets utgiftsfordeling",
    "aciklama": "Fordeling av statens utgifter mellom folketrygden, helse, utdanning, forsvar og samferdsel.",
    "metrik": "2.140 mrd. kr",
    "degisim": 5.4,
    "degisimEtiket": "Nominell økning",
    "tarih": "Oktober 2026",
    "kaynak": "Finansdepartementet (Gul bok)",
    "dilimler": [
      {
        "ad": "Konut & Kira",
        "oran": 35,
        "renk": "vann"
      },
      {
        "ad": "Gıda & İçecek",
        "oran": 25,
        "renk": "blekk"
      },
      {
        "ad": "Ulaştırma",
        "oran": 18,
        "renk": "signalrod"
      },
      {
        "ad": "Faturalar",
        "oran": 12,
        "renk": "kontur"
      },
      {
        "ad": "Diğer",
        "oran": 10,
        "renk": "gra"
      }
    ],
    "mebiusTitle": "Total Expenses Chart",
    "exportName": "TotalExpensesChart",
    "mebiusFile": "total-expenses-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-expenses.webp",
    "hoydeKurve": 2,
    "kartbladRef": "N50-1901-II"
  },
  {
    "id": "charts-cash-flow-area",
    "tur": "alan",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Petroleumsskatteinntekter og kontantstrøm",
    "aciklama": "Statens månedlige netto kontantstrøm fra petroleumsvirksomheten på sokkelen.",
    "metrik": "48,2 mrd. kr",
    "degisim": -8.6,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB Tabell 10940)",
    "seri": [
      {
        "etiket": "1. Hafta",
        "deger": 180
      },
      {
        "etiket": "2. Hafta",
        "deger": 195
      },
      {
        "etiket": "3. Hafta",
        "deger": 210
      },
      {
        "etiket": "4. Hafta",
        "deger": 240
      }
    ],
    "mebiusTitle": "Cash Flow Area Chart",
    "exportName": "CashFlowAreaChart",
    "mebiusFile": "cash-flow-area-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-area.webp",
    "hoydeKurve": 3,
    "kartbladRef": "N50-1902-III"
  },
  {
    "id": "charts-overview",
    "tur": "coklu-karma",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Styringsrente og inflasjonsutvikling (KPI)",
    "aciklama": "Norges Banks styringsrente sett opp mot konsumprisindeksen og kjerneinflasjonen (KPI-JAE).",
    "metrik": "Styringsrente: 4,50 %",
    "degisim": 0,
    "degisimEtiket": "Uendret siste rentemøte",
    "tarih": "30. oktober 2026",
    "kaynak": "Norges Bank & Statistisk sentralbyrå",
    "seriler": [
      {
        "etiket": "Man",
        "cubuk": 85,
        "cizgi": 10650
      },
      {
        "etiket": "Tir",
        "cubuk": 92,
        "cizgi": 10720
      },
      {
        "etiket": "Ons",
        "cubuk": 78,
        "cizgi": 10690
      },
      {
        "etiket": "Tor",
        "cubuk": 105,
        "cizgi": 10810
      },
      {
        "etiket": "Fre",
        "cubuk": 118,
        "cizgi": 10840
      }
    ],
    "mebiusTitle": "Overview Chart",
    "exportName": "OverviewChart",
    "mebiusFile": "overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-overview.webp",
    "hoydeKurve": 4,
    "kartbladRef": "N50-1903-IV"
  },
  {
    "id": "charts-price-range",
    "tur": "aralik-bant",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Kvadratmeterpriser for bolig etter fylke",
    "aciklama": "Spenn i gjennomsnittlig kvadratmeterpris for omsatte eneboliger og leiligheter.",
    "metrik": "94.200 kr/m² (Oslo)",
    "degisim": 4.8,
    "degisimEtiket": "Årsvekst i boligpriser",
    "tarih": "30. oktober 2026",
    "kaynak": "Eiendom Norge & SSB (Tabell 07221)",
    "araliklar": [
      {
        "etiket": "THYAO",
        "min": 280,
        "max": 298,
        "mevcut": 294
      },
      {
        "etiket": "TUPRS",
        "min": 165,
        "max": 178,
        "mevcut": 174
      },
      {
        "etiket": "AKBNK",
        "min": 58,
        "max": 64,
        "mevcut": 62.5
      },
      {
        "etiket": "KCHOL",
        "min": 210,
        "max": 226,
        "mevcut": 222
      },
      {
        "etiket": "BIMAS",
        "min": 490,
        "max": 515,
        "mevcut": 508
      }
    ],
    "mebiusTitle": "Price Range Chart",
    "exportName": "PriceRangeChart",
    "mebiusFile": "price-range-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-price-range.webp",
    "hoydeKurve": 5,
    "kartbladRef": "N50-1904-I"
  },
  {
    "id": "charts-balance",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Husholdningenes samlede gjeld (K2)",
    "aciklama": "Norske husholdningers innenlandske bruttogjeld og gjeldsvekst mot inntekt.",
    "metrik": "4.320 mrd. kr",
    "degisim": 3.2,
    "degisimEtiket": "Tolvmånedersvekst",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (Kredittindikatoren)",
    "seri": [
      {
        "etiket": "Jun",
        "deger": 8500
      },
      {
        "etiket": "Jul",
        "deger": 8750
      },
      {
        "etiket": "Aug",
        "deger": 9000
      },
      {
        "etiket": "Sep",
        "deger": 9250
      },
      {
        "etiket": "Okt",
        "deger": 9420
      }
    ],
    "mebiusTitle": "Balance Chart",
    "exportName": "BalanceChart",
    "mebiusFile": "balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-balance.webp",
    "hoydeKurve": 6,
    "kartbladRef": "N50-1905-II"
  },
  {
    "id": "charts-total-sales",
    "tur": "sutun",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Kraftproduksjon og krafteksport",
    "aciklama": "Kvartalsvis vannkraftproduksjon og netto krafteksport til det europeiske markedet.",
    "metrik": "38,4 TWh",
    "degisim": 6.2,
    "degisimEtiket": "Kvartalsvis produksjonsvekst",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statnett & NVE",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 1420
      },
      {
        "etiket": "2025/4Ç",
        "deger": 1580
      },
      {
        "etiket": "2026/1Ç",
        "deger": 1640
      },
      {
        "etiket": "2026/2Ç",
        "deger": 1720
      },
      {
        "etiket": "2026/3Ç",
        "deger": 1850
      }
    ],
    "mebiusTitle": "Total Sales Chart",
    "exportName": "TotalSalesChart",
    "mebiusFile": "total-sales-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-sales.webp",
    "hoydeKurve": 7,
    "kartbladRef": "N50-1906-III"
  },
  {
    "id": "charts-customer-rate",
    "tur": "nokta-dagilim",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Sysselsetting og registrert arbeidsledighet",
    "aciklama": "Forholdet mellom ledige stillinger og registrerte helt ledige personer hos NAV.",
    "metrik": "2,0 % Arbeidsledighet",
    "degisim": 0.2,
    "degisimEtiket": "Prosentpoeng endring",
    "tarih": "Oktober 2026",
    "kaynak": "NAV & SSB (Arbeidskraftundersøkelsen)",
    "noktalar": [
      {
        "x": 10,
        "y": 25
      },
      {
        "x": 20,
        "y": 45
      },
      {
        "x": 30,
        "y": 60
      },
      {
        "x": 40,
        "y": 55
      },
      {
        "x": 50,
        "y": 80
      },
      {
        "x": 60,
        "y": 72
      },
      {
        "x": 70,
        "y": 90
      },
      {
        "x": 80,
        "y": 85
      },
      {
        "x": 90,
        "y": 95
      }
    ],
    "mebiusTitle": "Customer Rate Chart",
    "exportName": "CustomerRateChart",
    "mebiusFile": "customer-rate-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-customer-rate.webp",
    "hoydeKurve": 8,
    "kartbladRef": "N50-1907-IV"
  },
  {
    "id": "charts-cumulative-assets-and-liabilities",
    "tur": "yigilmis-sutun",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Oljekorrigert budsjettunderskudd og handlingsregelen",
    "aciklama": "Bruk av oljepenger i statsbudsjettet målt mot 3-prosentbanen for fondsavkastning.",
    "metrik": "382 mrd. kr (2,8 % av fondet)",
    "degisim": -0.2,
    "degisimEtiket": "Under 3 % handlingsregelen",
    "tarih": "Oktober 2026",
    "kaynak": "Finansdepartementet",
    "gruplar": [
      {
        "etiket": "2023",
        "varlik": 22000,
        "yukumluluk": 21000
      },
      {
        "etiket": "2024",
        "varlik": 26000,
        "yukumluluk": 24800
      },
      {
        "etiket": "2025",
        "varlik": 29500,
        "yukumluluk": 28200
      },
      {
        "etiket": "2026",
        "varlik": 31250,
        "yukumluluk": 29800
      }
    ],
    "mebiusTitle": "Cumulative Assets and Liabilities Chart",
    "exportName": "CumulativeAssetsAndLiabilitiesChart",
    "mebiusFile": "cumulative-assets-and-liabilities-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cumulative-assets-and-liabilities.webp",
    "hoydeKurve": 9,
    "kartbladRef": "N50-1908-I"
  },
  {
    "id": "charts-cash-flow-monthly-bar",
    "tur": "sutun",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Spotpris på strøm i prisområde NO1–NO5",
    "aciklama": "Månedlig gjennomsnittlig spotpris på kraftbørsen Nord Pool eksklusive nettleie og avgifter.",
    "metrik": "74,5 øre/kWh",
    "degisim": -12.4,
    "degisimEtiket": "Endring fra forrige måned",
    "tarih": "Oktober 2026",
    "kaynak": "Nord Pool Spot & NVE",
    "seri": [
      {
        "etiket": "Jun",
        "deger": 48000
      },
      {
        "etiket": "Jul",
        "deger": 52000
      },
      {
        "etiket": "Aug",
        "deger": 51500
      },
      {
        "etiket": "Sep",
        "deger": 58400
      },
      {
        "etiket": "Okt",
        "deger": 65400
      }
    ],
    "mebiusTitle": "Cash Flow Monthly Bar Chart",
    "exportName": "CashFlowMonthlyBarChart",
    "mebiusFile": "cash-flow-monthly-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-monthly-bar.webp",
    "hoydeKurve": 10,
    "kartbladRef": "N50-1909-II"
  },
  {
    "id": "charts-cash-balance",
    "tur": "alan",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Serbest Nakit Rezervi (Norge)",
    "aciklama": "Finansal sistemin gecelik repo ve likidite imkânları bakiyesi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "185 Mr kr",
    "degisim": 2.8,
    "degisimEtiket": "Årlig endring",
    "tarih": "30. oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Man",
        "deger": 162
      },
      {
        "etiket": "Tir",
        "deger": 170
      },
      {
        "etiket": "Ons",
        "deger": 175
      },
      {
        "etiket": "Tor",
        "deger": 180
      },
      {
        "etiket": "Fre",
        "deger": 185
      }
    ],
    "mebiusTitle": "Cash Balance Chart",
    "exportName": "CashBalanceChart",
    "mebiusFile": "cash-balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-balance.webp",
    "hoydeKurve": 1,
    "kartbladRef": "N50-1910-III"
  },
  {
    "id": "charts-net-worth",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Net Finansal Değer Eğrisi (Norge)",
    "aciklama": "Borçlardan arındırılmış net varlık büyüklüğünün 5 yıllık trendi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "890.000 kr",
    "degisim": 18.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "2022",
        "deger": 320
      },
      {
        "etiket": "2023",
        "deger": 480
      },
      {
        "etiket": "2024",
        "deger": 620
      },
      {
        "etiket": "2025",
        "deger": 750
      },
      {
        "etiket": "2026",
        "deger": 890
      }
    ],
    "mebiusTitle": "Net Worth Chart",
    "exportName": "NetWorthChart",
    "mebiusFile": "net-worth-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-net-worth.webp",
    "hoydeKurve": 2,
    "kartbladRef": "N50-1911-IV"
  },
  {
    "id": "charts-financial-breakdown",
    "tur": "aralik-bant",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Gelir Dilimleri Gider Kırılımı (Norge)",
    "aciklama": "En düşükten en yükseğe hanehalkı harcama sepeti taban-tavan aralıkları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%34 – %62 Gıda Payı kr",
    "degisim": -1.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "araliklar": [
      {
        "etiket": "%20 Alt",
        "min": 45,
        "max": 65,
        "mevcut": 58
      },
      {
        "etiket": "%20 II",
        "min": 38,
        "max": 52,
        "mevcut": 46
      },
      {
        "etiket": "%20 III",
        "min": 30,
        "max": 44,
        "mevcut": 37
      },
      {
        "etiket": "%20 IV",
        "min": 22,
        "max": 35,
        "mevcut": 28
      },
      {
        "etiket": "%20 Üst",
        "min": 14,
        "max": 24,
        "mevcut": 18
      }
    ],
    "mebiusTitle": "Financial Breakdown Chart",
    "exportName": "FinancialBreakdownChart",
    "mebiusFile": "financial-breakdown-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-financial-breakdown.webp",
    "hoydeKurve": 3,
    "kartbladRef": "N50-1912-I"
  },
  {
    "id": "charts-finance-overview-area",
    "tur": "alan",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Finansal Denge Alanı (Norge)",
    "aciklama": "Merkezi yönetim bütçe açığının GSYH'ye oranı eğilimi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%3,1 / GSYH kr",
    "degisim": 0.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "2024/4Ç",
        "deger": 4.8
      },
      {
        "etiket": "2025/2Ç",
        "deger": 4.2
      },
      {
        "etiket": "2025/4Ç",
        "deger": 3.8
      },
      {
        "etiket": "2026/2Ç",
        "deger": 3.4
      },
      {
        "etiket": "2026/3Ç",
        "deger": 3.1
      }
    ],
    "mebiusTitle": "Finance Overview Area Chart",
    "exportName": "FinanceOverviewAreaChart",
    "mebiusFile": "finance-overview-area-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-area.webp",
    "hoydeKurve": 4,
    "kartbladRef": "N50-1913-II"
  },
  {
    "id": "charts-total-balance",
    "tur": "sutun",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Konsolide Kredi Hacmi (Norge)",
    "aciklama": "Ticari ve tüketici kredilerinin toplam büyüme eğilimi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "16.480 Mr kr",
    "degisim": 9.3,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Jan",
        "deger": 13200
      },
      {
        "etiket": "Mar",
        "deger": 13900
      },
      {
        "etiket": "Mai",
        "deger": 14600
      },
      {
        "etiket": "Jul",
        "deger": 15400
      },
      {
        "etiket": "Okt",
        "deger": 16480
      }
    ],
    "mebiusTitle": "Total Balance Chart",
    "exportName": "TotalBalanceChart",
    "mebiusFile": "total-balance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-balance.webp",
    "hoydeKurve": 5,
    "kartbladRef": "N50-1914-III"
  },
  {
    "id": "charts-budget",
    "tur": "sutun",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Bütçe Hedef Gerçekleşmesi (Norge)",
    "aciklama": "Hedeflenen kamu harcamaları ile gerçekleşen tutarların karşılaştırması. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%88,4 Oran kr",
    "degisim": -3.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "Januar–oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Personel",
        "deger": 94
      },
      {
        "etiket": "Yatırım",
        "deger": 82
      },
      {
        "etiket": "Cari Transfer",
        "deger": 89
      },
      {
        "etiket": "Faiz",
        "deger": 86
      }
    ],
    "mebiusTitle": "Budget Chart",
    "exportName": "BudgetChart",
    "mebiusFile": "budget-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget.webp",
    "hoydeKurve": 6,
    "kartbladRef": "N50-1915-IV"
  },
  {
    "id": "charts-investment-performance",
    "tur": "coklu-karma",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Fon Türleri Yıllık Getirisi (Norge)",
    "aciklama": "Hisse senedi, altın ve para piyasası fonlarının yıllık reel getirisi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "▲ %54,2 Zirve kr",
    "degisim": 5.8,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seriler": [
      {
        "etiket": "Hisse Fonu",
        "cubuk": 54.2,
        "cizgi": 48
      },
      {
        "etiket": "Altın Fonu",
        "cubuk": 46.8,
        "cizgi": 42.5
      },
      {
        "etiket": "Eurobond",
        "cubuk": 38,
        "cizgi": 35
      },
      {
        "etiket": "Para Piyasası",
        "cubuk": 48.5,
        "cizgi": 47
      }
    ],
    "mebiusTitle": "Investment Performance Chart",
    "exportName": "InvestmentPerformanceChart",
    "mebiusFile": "investment-performance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-investment-performance.webp",
    "hoydeKurve": 7,
    "kartbladRef": "N50-1916-I"
  },
  {
    "id": "charts-financial-trends",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Ekonomik Güven Endeksi (Norge)",
    "aciklama": "Tüketici, reel kesim ve hizmet sektörü bileşik güven eğilimi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "98,4 Puan kr",
    "degisim": 2.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Mai",
        "deger": 92.4
      },
      {
        "etiket": "Jun",
        "deger": 93.8
      },
      {
        "etiket": "Jul",
        "deger": 95.1
      },
      {
        "etiket": "Aug",
        "deger": 96
      },
      {
        "etiket": "Sep",
        "deger": 97.2
      },
      {
        "etiket": "Okt",
        "deger": 98.4
      }
    ],
    "mebiusTitle": "Financial Trends Chart",
    "exportName": "FinancialTrendsChart",
    "mebiusFile": "financial-trends-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-financial-trends.webp",
    "hoydeKurve": 8,
    "kartbladRef": "N50-1917-II"
  },
  {
    "id": "charts-analytics",
    "tur": "coklu-karma",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Sektör Volatilite ve Likidite Endeksi (Norge)",
    "aciklama": "Hisselerin dalgalanma katsayısı ve takas yoğunluğu endeksi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "14,8 Endeks kr",
    "degisim": -4.1,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seriler": [
      {
        "etiket": "Banka",
        "cubuk": 18.2,
        "cizgi": 16
      },
      {
        "etiket": "Sanayi",
        "cubuk": 12.4,
        "cizgi": 11.5
      },
      {
        "etiket": "Hizmet",
        "cubuk": 14,
        "cizgi": 13.2
      },
      {
        "etiket": "Teknoloji",
        "cubuk": 22.5,
        "cizgi": 20.1
      }
    ],
    "mebiusTitle": "Analytics Chart",
    "exportName": "AnalyticsChart",
    "mebiusFile": "analytics-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-analytics.webp",
    "hoydeKurve": 9,
    "kartbladRef": "N50-1918-III"
  },
  {
    "id": "charts-cash-flow-daily-bar",
    "tur": "sutun",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Günlük Net Fon Akımı (Norge)",
    "aciklama": "BIST ve DİBS piyasasına günlük yabancı ve yerleşik fon giriş-çıkışı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "+4,2 Mr kr",
    "degisim": 6.1,
    "degisimEtiket": "Årlig endring",
    "tarih": "30. oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Man",
        "deger": 2.1
      },
      {
        "etiket": "Tir",
        "deger": 1.8
      },
      {
        "etiket": "Ons",
        "deger": 3.4
      },
      {
        "etiket": "Tor",
        "deger": 2.9
      },
      {
        "etiket": "Fre",
        "deger": 4.2
      }
    ],
    "mebiusTitle": "Cash Flow Daily Bar Chart",
    "exportName": "CashFlowDailyBarChart",
    "mebiusFile": "cash-flow-daily-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-cash-flow-daily-bar.webp",
    "hoydeKurve": 10,
    "kartbladRef": "N50-1919-IV"
  },
  {
    "id": "charts-spending-overview-range",
    "tur": "aralik-bant",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Kartlı Harcama Salınım Aralığı (Norge)",
    "aciklama": "Haftalık kredi kartı işlem tutarlarının mevsimsel bant aralığı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "14 Mr – ₺22 Mr kr",
    "degisim": -1.8,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "araliklar": [
      {
        "etiket": "1. Hf",
        "min": 14.5,
        "max": 18.2,
        "mevcut": 16.4
      },
      {
        "etiket": "2. Hf",
        "min": 15,
        "max": 19.5,
        "mevcut": 17.8
      },
      {
        "etiket": "3. Hf",
        "min": 16.2,
        "max": 20.8,
        "mevcut": 18.5
      },
      {
        "etiket": "4. Hf",
        "min": 17,
        "max": 22,
        "mevcut": 20.1
      }
    ],
    "mebiusTitle": "Spending Overview Range Chart",
    "exportName": "SpendingOverviewRangeChart",
    "mebiusFile": "spending-overview-range-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-range.webp",
    "hoydeKurve": 1,
    "kartbladRef": "N50-1900-I"
  },
  {
    "id": "charts-budget-overview",
    "tur": "sutun",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Kamu Harcama Kalemleri Dağılımı (Norge)",
    "aciklama": "Yıllık bütçe harcamalarında en büyük paya sahip 5 temel alan. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "4.850 Mr kr",
    "degisim": 4.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Eğitim",
        "deger": 1280
      },
      {
        "etiket": "Sağlık",
        "deger": 1050
      },
      {
        "etiket": "Sosyal Güvenlik",
        "deger": 1420
      },
      {
        "etiket": "Ulaştırma",
        "deger": 650
      },
      {
        "etiket": "Tarım Destek",
        "deger": 450
      }
    ],
    "mebiusTitle": "Budget Overview Chart",
    "exportName": "BudgetOverviewChart",
    "mebiusFile": "budget-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-overview.webp",
    "hoydeKurve": 2,
    "kartbladRef": "N50-1901-II"
  },
  {
    "id": "charts-sales-target",
    "tur": "radyal-hedef",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Yıllık İhracat Hedef Gerçekleşmesi (Norge)",
    "aciklama": "OVP 2026 ihracat hedefi karşısında gerçekleşen kümülatif tutar. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%92,8 Hedef kr",
    "degisim": 7.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "oran": 92.8,
    "hedef": 100,
    "mebiusTitle": "Sales Target Chart",
    "exportName": "SalesTargetChart",
    "mebiusFile": "sales-target-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-sales-target.webp",
    "hoydeKurve": 3,
    "kartbladRef": "N50-1902-III"
  },
  {
    "id": "charts-your-asset",
    "tur": "halka-pay",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Örnek Dengeli Portföy Dağılımı (Norge)",
    "aciklama": "Orta vadeli dengeli varlık dağılım modelinde pay oranları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "500.000 Model kr",
    "degisim": 11.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "dilimler": [
      {
        "ad": "BIST Hisse Senedi",
        "oran": 35,
        "renk": "vann"
      },
      {
        "ad": "Altın & Kıymetli Maden",
        "oran": 25,
        "renk": "blekk"
      },
      {
        "ad": "Kısa Vadeli Bono/Mevduat",
        "oran": 25,
        "renk": "signalrod"
      },
      {
        "ad": "Eurobond / Döviz",
        "oran": 15,
        "renk": "kontur"
      }
    ],
    "mebiusTitle": "Your Asset Chart",
    "exportName": "YourAssetChart",
    "mebiusFile": "your-asset-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-your-asset.webp",
    "hoydeKurve": 4,
    "kartbladRef": "N50-1903-IV"
  },
  {
    "id": "charts-budget-plan",
    "tur": "akis-selale",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Bütçe ve Tasarruf Akışı (Norge)",
    "aciklama": "Net gelirden zorunlu giderler ve birikim ayrıldıktan sonraki serbest bakiye. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "18.500 Net kr",
    "degisim": 15,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "adimlari": [
      {
        "ad": "Toplam Gelir",
        "deger": 60000,
        "tur": "artis"
      },
      {
        "ad": "Kira & Konut",
        "deger": -22000,
        "tur": "azalis"
      },
      {
        "ad": "Temel Giderler",
        "deger": -14000,
        "tur": "azalis"
      },
      {
        "ad": "Bireysel Emeklilik",
        "deger": -5500,
        "tur": "azalis"
      },
      {
        "ad": "Kalan Tasarruf",
        "deger": 18500,
        "tur": "net"
      }
    ],
    "mebiusTitle": "Budget Plan Chart",
    "exportName": "BudgetPlanChart",
    "mebiusFile": "budget-plan-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-plan.webp",
    "hoydeKurve": 5,
    "kartbladRef": "N50-1904-I"
  },
  {
    "id": "charts-spending-overview-cylinder",
    "tur": "sutun",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Kategori Bazlı Harcama Yoğunluğu (Norge)",
    "aciklama": "Aylık kartlı harcamalarda en yoğun işlem adedine sahip sektörler. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "142 İşlem kr",
    "degisim": -3.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Market",
        "deger": 58
      },
      {
        "etiket": "Yemek",
        "deger": 34
      },
      {
        "etiket": "Yakıt",
        "deger": 22
      },
      {
        "etiket": "Giyim",
        "deger": 16
      },
      {
        "etiket": "Kültür",
        "deger": 12
      }
    ],
    "mebiusTitle": "Spending Overview Cylinder Chart",
    "exportName": "SpendingOverviewCylinderChart",
    "mebiusFile": "spending-overview-cylinder-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-cylinder.webp",
    "hoydeKurve": 6,
    "kartbladRef": "N50-1905-II"
  },
  {
    "id": "charts-budget-health",
    "tur": "radyal-hedef",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Finansal Sağlık Skoru (Norge)",
    "aciklama": "Borçluluk, likidite tamponu ve düzenli birikim kriterlerine göre genel skor. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "84 / 100 kr",
    "degisim": 4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "oran": 84,
    "hedef": 100,
    "mebiusTitle": "Budget Health Chart",
    "exportName": "BudgetHealthChart",
    "mebiusFile": "budget-health-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-budget-health.webp",
    "hoydeKurve": 7,
    "kartbladRef": "N50-1906-III"
  },
  {
    "id": "charts-category-breakdown",
    "tur": "halka-pay",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Sektörel Kredi Dağılımı (Norge)",
    "aciklama": "Bankacılık sektöründe ticari kredilerin sektör bazında payı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "11.200 Mr kr",
    "degisim": 8.9,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "dilimler": [
      {
        "ad": "İmalat Sanayi",
        "oran": 32,
        "renk": "vann"
      },
      {
        "ad": "Toptan & Perakende",
        "oran": 24,
        "renk": "blekk"
      },
      {
        "ad": "İnşaat",
        "oran": 18,
        "renk": "signalrod"
      },
      {
        "ad": "Enerji",
        "oran": 14,
        "renk": "kontur"
      },
      {
        "ad": "Turizm & Diğer",
        "oran": 12,
        "renk": "gra"
      }
    ],
    "mebiusTitle": "Category Breakdown Chart",
    "exportName": "CategoryBreakdownChart",
    "mebiusFile": "category-breakdown-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-category-breakdown.webp",
    "hoydeKurve": 8,
    "kartbladRef": "N50-1907-IV"
  },
  {
    "id": "charts-finance-overview-flow",
    "tur": "akis-selale",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Merkez Bankası Rezerv Akışı (Norge)",
    "aciklama": "Brüt rezervlerdeki döviz alımı, ihracat bedeli ve kamu çıkışlarının dengesi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "+$4,8 Mr Net kr",
    "degisim": 14.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "30. oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "adimlari": [
      {
        "ad": "Önceki Rezerv",
        "deger": 152,
        "tur": "artis"
      },
      {
        "ad": "Reeskont Kredisi",
        "deger": 3.8,
        "tur": "artis"
      },
      {
        "ad": "Piyasa Alımı",
        "deger": 2.5,
        "tur": "artis"
      },
      {
        "ad": "Dış Borç Ödemesi",
        "deger": -1.5,
        "tur": "azalis"
      },
      {
        "ad": "Güncel Rezerv",
        "deger": 156.8,
        "tur": "net"
      }
    ],
    "mebiusTitle": "Finance Overview Flow Chart",
    "exportName": "FinanceOverviewFlowChart",
    "mebiusFile": "finance-overview-flow-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-flow.webp",
    "hoydeKurve": 9,
    "kartbladRef": "N50-1908-I"
  },
  {
    "id": "charts-value-locked",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "KKM Toplam Kilitli Bakiye (Norge)",
    "aciklama": "Kur Korumalı Mevduat hesaplarından standart TL mevduata geçiş eğrisi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "840 Mr kr",
    "degisim": -12.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Jun",
        "deger": 1650
      },
      {
        "etiket": "Jul",
        "deger": 1420
      },
      {
        "etiket": "Aug",
        "deger": 1180
      },
      {
        "etiket": "Sep",
        "deger": 980
      },
      {
        "etiket": "Okt",
        "deger": 840
      }
    ],
    "mebiusTitle": "Value Locked Chart",
    "exportName": "ValueLockedChart",
    "mebiusFile": "value-locked-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-value-locked.webp",
    "hoydeKurve": 10,
    "kartbladRef": "N50-1909-II"
  },
  {
    "id": "charts-saving-progress",
    "tur": "radyal-hedef",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Yıllık Birikim Hedefi İlerlemesi (Norge)",
    "aciklama": "Hedeflenen 6 aylık acil durum fonu oluşturma hedefinde ulaşılan seviye. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%78,5 Seviye kr",
    "degisim": 6.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "oran": 78.5,
    "hedef": 100,
    "mebiusTitle": "Saving Progress Chart",
    "exportName": "SavingProgressChart",
    "mebiusFile": "saving-progress-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-saving-progress.webp",
    "hoydeKurve": 1,
    "kartbladRef": "N50-1910-III"
  },
  {
    "id": "charts-finance-overview-diverging-bar",
    "tur": "ayrisan-cubuk",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Dış Ticaret Net Denge Ayrışması (Norge)",
    "aciklama": "Ana sektör gruplarında ihracat-ithalat farkı (fazla: yeşil, açık: kırmızı). Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "-$3,4 Mr Açık kr",
    "degisim": 18.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "September 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Finance Overview Diverging Bar Chart",
    "exportName": "FinanceOverviewDivergingBarChart",
    "mebiusFile": "charts-finance-overview-diverging-bar.tsx",
    "previewImage": "charts-finance-overview-diverging-bar.webp",
    "seri": [
      {
        "etiket": "Tarım",
        "deger": 1.2
      },
      {
        "etiket": "Tekstil",
        "deger": 2.4
      },
      {
        "etiket": "Otomotiv",
        "deger": 1.8
      },
      {
        "etiket": "Kimya",
        "deger": -3.8
      },
      {
        "etiket": "Enerji",
        "deger": -5
      }
    ],
    "hoydeKurve": 2,
    "kartbladRef": "N50-1911-IV"
  },
  {
    "id": "charts-budget-allocation",
    "tur": "halka-pay",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Kamu Yatırım Ödenekleri (Norge)",
    "aciklama": "Sektörel kamu yatırım tahsisatında öncelikli alanların payları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "1.240 Mr kr",
    "degisim": 5.1,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Budget Allocation Chart",
    "exportName": "BudgetAllocationChart",
    "mebiusFile": "charts-budget-allocation.tsx",
    "previewImage": "charts-budget-allocation.webp",
    "dilimler": [
      {
        "ad": "Demiryolu & Lojistik",
        "oran": 30,
        "renk": "vann"
      },
      {
        "ad": "Sulama & Tarım",
        "oran": 24,
        "renk": "blekk"
      },
      {
        "ad": "Eğitim Altyapısı",
        "oran": 20,
        "renk": "signalrod"
      },
      {
        "ad": "Sağlık Tesisleri",
        "oran": 16,
        "renk": "kontur"
      },
      {
        "ad": "Teknoloji & AR-GE",
        "oran": 10,
        "renk": "gra"
      }
    ],
    "hoydeKurve": 3,
    "kartbladRef": "N50-1912-I"
  },
  {
    "id": "charts-asset-overview-radial",
    "tur": "radyal-hedef",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Portföy Verimlilik Oranı (Norge)",
    "aciklama": "Piyasa karşılaştırma ölçütüne (benchmark) göre sağlanan göreli getiri. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%82 Verim kr",
    "degisim": 3.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Asset Overview Radial Chart",
    "exportName": "AssetOverviewRadialChart",
    "mebiusFile": "charts-asset-overview-radial.tsx",
    "previewImage": "charts-asset-overview-radial.webp",
    "oran": 82,
    "hedef": 100,
    "hoydeKurve": 4,
    "kartbladRef": "N50-1913-II"
  },
  {
    "id": "charts-options-portfolio",
    "tur": "ayrisan-cubuk",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "VİOP Korunma (Hedge) Kâr-Zarar Payoff (Norge)",
    "aciklama": "Farklı endeks seviyelerinde opsiyon portföyünün simüle edilen net getirisi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "+42.500 Net kr",
    "degisim": 9.1,
    "degisimEtiket": "Årlig endring",
    "tarih": "Forfall: desember 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Options Portfolio Chart",
    "exportName": "OptionsPortfolioChart",
    "mebiusFile": "charts-options-portfolio.tsx",
    "previewImage": "charts-options-portfolio.webp",
    "seri": [
      {
        "etiket": "9.500",
        "deger": -18
      },
      {
        "etiket": "10.000",
        "deger": -4
      },
      {
        "etiket": "10.500",
        "deger": 8.5
      },
      {
        "etiket": "11.000",
        "deger": 22
      },
      {
        "etiket": "11.500",
        "deger": 42.5
      }
    ],
    "hoydeKurve": 5,
    "kartbladRef": "N50-1914-III"
  },
  {
    "id": "charts-revenue-growth",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Reel Hasılat Büyüme Oranı (Norge)",
    "aciklama": "Enflasyondan arındırılmış reel satış hasılatı artış eğrisi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%22,4 Reel kr",
    "degisim": 4.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Revenue Growth Chart",
    "exportName": "RevenueGrowthChart",
    "mebiusFile": "charts-revenue-growth.tsx",
    "previewImage": "charts-revenue-growth.webp",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 12
      },
      {
        "etiket": "2025/4Ç",
        "deger": 14.5
      },
      {
        "etiket": "2026/1Ç",
        "deger": 17.2
      },
      {
        "etiket": "2026/2Ç",
        "deger": 19.8
      },
      {
        "etiket": "2026/3Ç",
        "deger": 22.4
      }
    ],
    "hoydeKurve": 6,
    "kartbladRef": "N50-1915-IV"
  },
  {
    "id": "charts-investment-app-adoption-by-country",
    "tur": "siralama-cubuk",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Fintek ve Yatırım Uygulaması Benimseme Oranı (Norge)",
    "aciklama": "Yetişkin nüfus içinde dijital yatırım hesabı kullanım oranı (Gelişmekte Olan Ülkeler). Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%68,2 Türkiye kr",
    "degisim": 8.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Investment App Adoption by Country Chart",
    "exportName": "InvestmentAppAdoptionByCountryChart",
    "mebiusFile": "charts-investment-app-adoption-by-country.tsx",
    "previewImage": "charts-investment-app-adoption-by-country.webp",
    "ogeler": [
      {
        "etiket": "Türkiye",
        "deger": 68.2
      },
      {
        "etiket": "Polonya",
        "deger": 62.4
      },
      {
        "etiket": "Brezilya",
        "deger": 58
      },
      {
        "etiket": "Meksika",
        "deger": 49.5
      },
      {
        "etiket": "Güney Afrika",
        "deger": 44
      }
    ],
    "hoydeKurve": 7,
    "kartbladRef": "N50-1916-I"
  },
  {
    "id": "charts-global-finance-market-forecast",
    "tur": "aralik-bant",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Enflasyon Tahmin Yelpazesi (Piyasa Beklenti Anketi) (Norge)",
    "aciklama": "Piyasa katılımcılarının 12 ay sonrası TÜFE beklenti aralıkları (alt, medyan, üst bant). Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%24,8 Medyan kr",
    "degisim": -2,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Global Finance Market Forecast Chart",
    "exportName": "GlobalFinanceMarketForecastChart",
    "mebiusFile": "charts-global-finance-market-forecast.tsx",
    "previewImage": "charts-global-finance-market-forecast.webp",
    "araliklar": [
      {
        "etiket": "3 Ay",
        "min": 28,
        "max": 35,
        "mevcut": 31.5
      },
      {
        "etiket": "6 Ay",
        "min": 24,
        "max": 30,
        "mevcut": 27
      },
      {
        "etiket": "12 Ay",
        "min": 20,
        "max": 28,
        "mevcut": 24.8
      },
      {
        "etiket": "24 Ay",
        "min": 14,
        "max": 20,
        "mevcut": 16.5
      }
    ],
    "hoydeKurve": 8,
    "kartbladRef": "N50-1917-II"
  },
  {
    "id": "charts-average-sales",
    "tur": "sutun",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Perakende Satış Hacmi Endeksi (Norge)",
    "aciklama": "Mevsim etkilerinden arındırılmış perakende ticaret hacmi çeyreklik seyri. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "124,5 Puan kr",
    "degisim": 3.6,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Average Sales Chart",
    "exportName": "AverageSalesChart",
    "mebiusFile": "charts-average-sales.tsx",
    "previewImage": "charts-average-sales.webp",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 108
      },
      {
        "etiket": "2025/4Ç",
        "deger": 114
      },
      {
        "etiket": "2026/1Ç",
        "deger": 118
      },
      {
        "etiket": "2026/2Ç",
        "deger": 121
      },
      {
        "etiket": "2026/3Ç",
        "deger": 124.5
      }
    ],
    "hoydeKurve": 9,
    "kartbladRef": "N50-1918-III"
  },
  {
    "id": "charts-performance",
    "tur": "coklu-karma",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Endeks Karşılaştırmalı Performans (Norge)",
    "aciklama": "BIST 100 (mürekkep sütun) ile BIST Sınai (kırmızı çizgi) getiri yarışı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "+%38,5 Getiri kr",
    "degisim": 12.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Performance Chart",
    "exportName": "PerformanceChart",
    "mebiusFile": "charts-performance.tsx",
    "previewImage": "charts-performance.webp",
    "seriler": [
      {
        "etiket": "1. Çeyrek",
        "cubuk": 12,
        "cizgi": 15
      },
      {
        "etiket": "2. Çeyrek",
        "cubuk": 22,
        "cizgi": 25
      },
      {
        "etiket": "3. Çeyrek",
        "cubuk": 31,
        "cizgi": 33
      },
      {
        "etiket": "Güncel",
        "cubuk": 38.5,
        "cizgi": 42
      }
    ],
    "hoydeKurve": 10,
    "kartbladRef": "N50-1919-IV"
  },
  {
    "id": "charts-investment-growth",
    "tur": "alan",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Bileşik Reel Yatırım Büyümesi (Norge)",
    "aciklama": "Düzenli aylık tasarruf ve kâr payı yeniden yatırımıyla oluşan bileşik getiri. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "540.000 kr",
    "degisim": 24,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "mebiusTitle": "Investment Growth Chart",
    "exportName": "InvestmentGrowthChart",
    "mebiusFile": "charts-investment-growth.tsx",
    "previewImage": "charts-investment-growth.webp",
    "seri": [
      {
        "etiket": "1. Yıl",
        "deger": 120
      },
      {
        "etiket": "2. Yıl",
        "deger": 180
      },
      {
        "etiket": "3. Yıl",
        "deger": 270
      },
      {
        "etiket": "4. Yıl",
        "deger": 390
      },
      {
        "etiket": "5. Yıl",
        "deger": 540
      }
    ],
    "hoydeKurve": 1,
    "kartbladRef": "N50-1900-I"
  },
  {
    "id": "charts-global-defi",
    "tur": "siralama-cubuk",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Dijital Varlık ve Sabit Coin Hacmi (Norge)",
    "aciklama": "Küresel ölçekte en yüksek likiditeye sahip rezerv ve ödeme varlıkları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "$182 Mr Toplam kr",
    "degisim": 15.6,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "ogeler": [
      {
        "etiket": "USDT (Tether)",
        "deger": 124
      },
      {
        "etiket": "USDC (Circle)",
        "deger": 38.5
      },
      {
        "etiket": "DAI / USDS",
        "deger": 11.2
      },
      {
        "etiket": "FDUSD",
        "deger": 4.8
      },
      {
        "etiket": "Diğer",
        "deger": 3.5
      }
    ],
    "mebiusTitle": "Global DeFi Chart",
    "exportName": "GlobalDefiChart",
    "mebiusFile": "global-defi-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-global-defi.webp",
    "hoydeKurve": 2,
    "kartbladRef": "N50-1901-II"
  },
  {
    "id": "charts-investment-app-user-age",
    "tur": "sutun",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Borsa Yatırımcı Yaş Grubu Dağılımı (Norge)",
    "aciklama": "MKK nezdinde hisse senedi hesabı bulunan pay senedi sahiplerinin yaş piramidi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "7,4 Milyon Yatırımcı kr",
    "degisim": 5,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "18-24",
        "deger": 12.5
      },
      {
        "etiket": "25-34",
        "deger": 38.2
      },
      {
        "etiket": "35-44",
        "deger": 26.4
      },
      {
        "etiket": "45-54",
        "deger": 14.8
      },
      {
        "etiket": "55+",
        "deger": 8.1
      }
    ],
    "mebiusTitle": "Investment App User Age Chart",
    "exportName": "InvestmentAppUserAgeChart",
    "mebiusFile": "investment-app-user-age-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-investment-app-user-age.webp",
    "hoydeKurve": 3,
    "kartbladRef": "N50-1902-III"
  },
  {
    "id": "charts-finance-overview-stacked-bar",
    "tur": "yigilmis-sutun",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Bütçe Gelirleri ve Giderleri Yığılımı (Norge)",
    "aciklama": "Vergi gelirleri ile harcama kalemlerinin çeyreklik karşılaştırması. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "1.840 Mr kr",
    "degisim": -1.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "gruplar": [
      {
        "etiket": "2025/4Ç",
        "varlik": 1450,
        "yukumluluk": 1580
      },
      {
        "etiket": "2026/1Ç",
        "varlik": 1580,
        "yukumluluk": 1690
      },
      {
        "etiket": "2026/2Ç",
        "varlik": 1710,
        "yukumluluk": 1820
      },
      {
        "etiket": "2026/3Ç",
        "varlik": 1840,
        "yukumluluk": 1940
      }
    ],
    "mebiusTitle": "Finance Overview Stacked Bar Chart",
    "exportName": "FinanceOverviewStackedBarChart",
    "mebiusFile": "finance-overview-stacked-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-stacked-bar.webp",
    "hoydeKurve": 4,
    "kartbladRef": "N50-1903-IV"
  },
  {
    "id": "charts-finance-overview-timeline",
    "tur": "alan",
    "kategori": "KRAFT & ENERGI",
    "baslik": "TCMB Politika Faizi Zaman Çizelgesi (Norge)",
    "aciklama": "Para Politikası Kurulu'nun bir haftalık repo ihale faiz oranı geçmiş kararları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%45,0 Politika Faizi kr",
    "degisim": 0,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026-beslutning",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Apr",
        "deger": 50
      },
      {
        "etiket": "Jun",
        "deger": 50
      },
      {
        "etiket": "Aug",
        "deger": 47.5
      },
      {
        "etiket": "Sep",
        "deger": 45
      },
      {
        "etiket": "Okt",
        "deger": 45
      }
    ],
    "mebiusTitle": "Finance Overview Timeline Chart",
    "exportName": "FinanceOverviewTimelineChart",
    "mebiusFile": "finance-overview-timeline-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-overview-timeline.webp",
    "hoydeKurve": 5,
    "kartbladRef": "N50-1904-I"
  },
  {
    "id": "charts-revenue-by-product-line",
    "tur": "siralama-cubuk",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "BIST Şirketleri Faaliyet Alanı Satış Payı (Norge)",
    "aciklama": "Lokomotif şirketlerin ana segment bazlı gelir ağırlığı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "820 Mr Hasılat kr",
    "degisim": 11.3,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "ogeler": [
      {
        "etiket": "Rafineri & Enerji",
        "deger": 340
      },
      {
        "etiket": "Otomotiv & Yan Sanayi",
        "deger": 260
      },
      {
        "etiket": "Dayanıklı Tüketim",
        "deger": 145
      },
      {
        "etiket": "Havacılık & Lojistik",
        "deger": 75
      }
    ],
    "mebiusTitle": "Revenue by Product Line Chart",
    "exportName": "RevenueByProductLineChart",
    "mebiusFile": "revenue-by-product-line-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-revenue-by-product-line.webp",
    "hoydeKurve": 6,
    "kartbladRef": "N50-1905-II"
  },
  {
    "id": "charts-growth-trends",
    "tur": "alan",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "İmalat Sanayi PMI Eğilimi (Norge)",
    "aciklama": "İstanbul Sanayi Odası Satın Alma Yöneticileri Endeksi (50 eşik: büyüme). Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "51,8 PMI kr",
    "degisim": 1.8,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Mai",
        "deger": 48.4
      },
      {
        "etiket": "Jun",
        "deger": 49.1
      },
      {
        "etiket": "Jul",
        "deger": 49.8
      },
      {
        "etiket": "Aug",
        "deger": 50.5
      },
      {
        "etiket": "Sep",
        "deger": 51.2
      },
      {
        "etiket": "Okt",
        "deger": 51.8
      }
    ],
    "mebiusTitle": "Growth Trends Chart",
    "exportName": "GrowthTrendsChart",
    "mebiusFile": "growth-trends-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-growth-trends.webp",
    "hoydeKurve": 7,
    "kartbladRef": "N50-1906-III"
  },
  {
    "id": "charts-asset-allocation",
    "tur": "halka-pay",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "BES Fon Portföyü Varlık Dağılımı (Norge)",
    "aciklama": "Bireysel Emeklilik Sistemi katılımcı fonlarının toplam varlık sınıfları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "1.150 Mr BES kr",
    "degisim": 7.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "dilimler": [
      {
        "ad": "Devlet İç Borçlanma (DİBS)",
        "oran": 38,
        "renk": "vann"
      },
      {
        "ad": "Hisse Senetleri",
        "oran": 28,
        "renk": "blekk"
      },
      {
        "ad": "Kıymetli Madenler",
        "oran": 18,
        "renk": "signalrod"
      },
      {
        "ad": "Döviz / Eurobond",
        "oran": 16,
        "renk": "kontur"
      }
    ],
    "mebiusTitle": "Asset Allocation Chart",
    "exportName": "AssetAllocationChart",
    "mebiusFile": "asset-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-asset-allocation.webp",
    "hoydeKurve": 8,
    "kartbladRef": "N50-1907-IV"
  },
  {
    "id": "charts-profit-margin-analysis",
    "tur": "ayrisan-cubuk",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Faaliyet Kâr Marjı Değişimi (Norge)",
    "aciklama": "Sanayi ve hizmet sektörlerinde FAVÖK marjı yıllık puan değişimi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "+%2,3 Puan kr",
    "degisim": 2.3,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Savunma",
        "deger": 4.5
      },
      {
        "etiket": "Havacılık",
        "deger": 3.2
      },
      {
        "etiket": "Perakende",
        "deger": 1.4
      },
      {
        "etiket": "Demir-Çelik",
        "deger": -2.8
      },
      {
        "etiket": "Petrokimya",
        "deger": -3.5
      }
    ],
    "mebiusTitle": "Profit Margin Analysis Chart",
    "exportName": "ProfitMarginAnalysisChart",
    "mebiusFile": "profit-margin-analysis-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-profit-margin-analysis.webp",
    "hoydeKurve": 9,
    "kartbladRef": "N50-1908-I"
  },
  {
    "id": "charts-monthly-income",
    "tur": "sutun",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Aylık Gelir Bileşenleri (Norge)",
    "aciklama": "Maaş, kira, temettü ve faiz gelirlerinin aylık hane bütçesine katkısı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "52.000 Ortalama kr",
    "degisim": 6,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Maaş",
        "deger": 38000
      },
      {
        "etiket": "Mevduat Faizi",
        "deger": 7500
      },
      {
        "etiket": "Kira Getirisi",
        "deger": 4500
      },
      {
        "etiket": "Temettü/Ek",
        "deger": 2000
      }
    ],
    "mebiusTitle": "Monthly Income Chart",
    "exportName": "MonthlyIncomeChart",
    "mebiusFile": "monthly-income-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-monthly-income.webp",
    "hoydeKurve": 10,
    "kartbladRef": "N50-1909-II"
  },
  {
    "id": "charts-asset-overview-bar",
    "tur": "sutun",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Finansal Varlık Tercihleri Dağılımı (Norge)",
    "aciklama": "Yurtiçi hanehalkının tasarruf araçlarındaki oransal büyüklük sıralaması. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "14.200 Mr kr",
    "degisim": 8.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "TL Mevduat",
        "deger": 58
      },
      {
        "etiket": "Döviz Tevdiat",
        "deger": 22
      },
      {
        "etiket": "Fiziki & Fon Altın",
        "deger": 12
      },
      {
        "etiket": "Hisse Senedi",
        "deger": 8
      }
    ],
    "mebiusTitle": "Asset Overview Bar Chart",
    "exportName": "AssetOverviewBarChart",
    "mebiusFile": "asset-overview-bar-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-asset-overview-bar.webp",
    "hoydeKurve": 1,
    "kartbladRef": "N50-1910-III"
  },
  {
    "id": "charts-sales-performance",
    "tur": "sutun",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "Aylık İhracat Performansı (Norge)",
    "aciklama": "Son 6 aydaki gerçekleşen aylık dış satım hacmi (milyar dolar). Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "$21,4 Milyar kr",
    "degisim": 4.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "September 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Mai",
        "deger": 19.8
      },
      {
        "etiket": "Jun",
        "deger": 20.2
      },
      {
        "etiket": "Jul",
        "deger": 20.9
      },
      {
        "etiket": "Aug",
        "deger": 21
      },
      {
        "etiket": "Sep",
        "deger": 21.4
      }
    ],
    "mebiusTitle": "Sales Performance Chart",
    "exportName": "SalesPerformanceChart",
    "mebiusFile": "sales-performance-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-sales-performance.webp",
    "hoydeKurve": 2,
    "kartbladRef": "N50-1911-IV"
  },
  {
    "id": "charts-expenses",
    "tur": "sutun",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Sabit ve Değişken Harcama Dengesi (Norge)",
    "aciklama": "Aylık zorunlu sabit yükümlülükler ile serbest harcamaların ayrımı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "38.400 Gider kr",
    "degisim": -3.1,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Kira/Kredi",
        "deger": 18000
      },
      {
        "etiket": "Market/Beslenme",
        "deger": 11500
      },
      {
        "etiket": "Faturalar",
        "deger": 4200
      },
      {
        "etiket": "Eğlence/Sosyal",
        "deger": 4700
      }
    ],
    "mebiusTitle": "Expenses Chart",
    "exportName": "ExpensesChart",
    "mebiusFile": "expenses-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-expenses.webp",
    "hoydeKurve": 3,
    "kartbladRef": "N50-1912-I"
  },
  {
    "id": "charts-total-revenue",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Merkezi Yönetim Vergi Tahsilatı (Norge)",
    "aciklama": "Gelir, kurumlar ve KDV/ÖTV tahsilatının kümülatif artış çizgisi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "6.450 Mr kr",
    "degisim": 16.8,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "1. Çeyrek",
        "deger": 1420
      },
      {
        "etiket": "2. Çeyrek",
        "deger": 3100
      },
      {
        "etiket": "3. Çeyrek",
        "deger": 4850
      },
      {
        "etiket": "Ekim",
        "deger": 6450
      }
    ],
    "mebiusTitle": "Total Revenue Chart",
    "exportName": "TotalRevenueChart",
    "mebiusFile": "total-revenue-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-total-revenue.webp",
    "hoydeKurve": 4,
    "kartbladRef": "N50-1913-II"
  },
  {
    "id": "charts-project-budget-allocation",
    "tur": "halka-pay",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "Yatırım Projeleri Bütçe Dağılımı (Norge)",
    "aciklama": "Kamu yatırımlarında büyük projelerin ödenek ağırlıkları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "480 Mr kr",
    "degisim": 6.4,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "dilimler": [
      {
        "ad": "Deprem Bölgesi Konut",
        "oran": 45,
        "renk": "vann"
      },
      {
        "ad": "Yüksek Hızlı Tren",
        "oran": 25,
        "renk": "blekk"
      },
      {
        "ad": "Yenilenebilir Enerji",
        "oran": 18,
        "renk": "signalrod"
      },
      {
        "ad": "Liman & Lojistik",
        "oran": 12,
        "renk": "kontur"
      }
    ],
    "mebiusTitle": "Project Budget Allocation Chart",
    "exportName": "ProjectBudgetAllocationChart",
    "mebiusFile": "project-budget-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-project-budget-allocation.webp",
    "hoydeKurve": 5,
    "kartbladRef": "N50-1914-III"
  },
  {
    "id": "charts-income-overview",
    "tur": "sutun",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Faiz Dışı Bütçe Gelirleri (Norge)",
    "aciklama": "Genel bütçe gelirlerinin vergi ve vergi dışı ana kalemlerindeki gelişim. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "5.840 Mr kr",
    "degisim": 12.1,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "ÖTV",
        "deger": 1120
      },
      {
        "etiket": "Dahilde KDV",
        "deger": 840
      },
      {
        "etiket": "İthalde KDV",
        "deger": 1260
      },
      {
        "etiket": "Gelir Vergisi",
        "deger": 1420
      },
      {
        "etiket": "Kurumlar Vergisi",
        "deger": 1200
      }
    ],
    "mebiusTitle": "Income Overview Chart",
    "exportName": "IncomeOverviewChart",
    "mebiusFile": "income-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-income-overview.webp",
    "hoydeKurve": 6,
    "kartbladRef": "N50-1915-IV"
  },
  {
    "id": "charts-spending-overview-scatter",
    "tur": "nokta-dagilim",
    "kategori": "KRAFT & ENERGI",
    "baslik": "Gelir ve Tüketim Esnekliği Saçılımı (Norge)",
    "aciklama": "Farklı gelir gruplarında temel gıda dışı harcama eğilimi saçılım noktaları. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "0,82 Korelasyon kr",
    "degisim": 0.04,
    "degisimEtiket": "Årlig endring",
    "tarih": "2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "noktalar": [
      {
        "x": 15,
        "y": 20
      },
      {
        "x": 25,
        "y": 28
      },
      {
        "x": 35,
        "y": 42
      },
      {
        "x": 45,
        "y": 48
      },
      {
        "x": 55,
        "y": 62
      },
      {
        "x": 65,
        "y": 68
      },
      {
        "x": 75,
        "y": 79
      },
      {
        "x": 85,
        "y": 88
      },
      {
        "x": 95,
        "y": 94
      }
    ],
    "mebiusTitle": "Spending Overview Scatter Chart",
    "exportName": "SpendingOverviewScatterChart",
    "mebiusFile": "spending-overview-scatter-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-spending-overview-scatter.webp",
    "hoydeKurve": 7,
    "kartbladRef": "N50-1916-I"
  },
  {
    "id": "charts-global-finance-market-combo",
    "tur": "coklu-karma",
    "kategori": "ARBEIDSLIV & LØNN",
    "baslik": "DİBS İhraç Hacmi ve Bileşik Faiz (Norge)",
    "aciklama": "Hazine iç borçlanma ihale tutarları (sütun) ve ağırlıklı faiz (çizgi). Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "65 Mr İhraç kr",
    "degisim": 10.2,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seriler": [
      {
        "etiket": "2 Yıl Sabit",
        "cubuk": 22,
        "cizgi": 39.5
      },
      {
        "etiket": "5 Yıl Sabit",
        "cubuk": 18.5,
        "cizgi": 34.2
      },
      {
        "etiket": "10 Yıl Sabit",
        "cubuk": 14,
        "cizgi": 31
      },
      {
        "etiket": "TÜFE Endeksli",
        "cubuk": 10.5,
        "cizgi": 18.5
      }
    ],
    "mebiusTitle": "Global Finance Market Combo Chart",
    "exportName": "GlobalFinanceMarketComboChart",
    "mebiusFile": "global-finance-market-combo-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-global-finance-market-combo.webp",
    "hoydeKurve": 8,
    "kartbladRef": "N50-1917-II"
  },
  {
    "id": "charts-finance-analytics",
    "tur": "alan",
    "kategori": "OLJEFONDET & BØRS",
    "baslik": "Sermaye Yeterlilik Rasyosu (SYR) (Norge)",
    "aciklama": "Türk bankacılık sektörünün Basel III yasal asgari sermaye yeterlilik oranı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "%17,4 SYR kr",
    "degisim": 0.6,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 16.8
      },
      {
        "etiket": "2025/4Ç",
        "deger": 17
      },
      {
        "etiket": "2026/1Ç",
        "deger": 16.9
      },
      {
        "etiket": "2026/2Ç",
        "deger": 17.2
      },
      {
        "etiket": "2026/3Ç",
        "deger": 17.4
      }
    ],
    "mebiusTitle": "Finance Analytics Chart",
    "exportName": "FinanceAnalyticsChart",
    "mebiusFile": "finance-analytics-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-finance-analytics.webp",
    "hoydeKurve": 9,
    "kartbladRef": "N50-1918-III"
  },
  {
    "id": "charts-ethereum",
    "tur": "alan",
    "kategori": "SAMFUNN & STATISTIKK",
    "baslik": "Gram Altın Fiyat Seyri (Norge)",
    "aciklama": "Serbest piyasa ve Borsa İstanbul Kıymetli Madenler seans kapanış fiyatı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "3.140 / Gram kr",
    "degisim": 2.8,
    "degisimEtiket": "Årlig endring",
    "tarih": "30. oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "Man",
        "deger": 3050
      },
      {
        "etiket": "Tir",
        "deger": 3080
      },
      {
        "etiket": "Ons",
        "deger": 3095
      },
      {
        "etiket": "Tor",
        "deger": 3120
      },
      {
        "etiket": "Fre",
        "deger": 3140
      }
    ],
    "mebiusTitle": "Ethereum Chart",
    "exportName": "EthereumChart",
    "mebiusFile": "ethereum-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-ethereum.webp",
    "hoydeKurve": 10,
    "kartbladRef": "N50-1919-IV"
  },
  {
    "id": "charts-revenue-overview",
    "tur": "sutun",
    "kategori": "MAKROØKONOMI & RENTER",
    "baslik": "BIST 100 Konsolide Hasılat Gelişimi (Norge)",
    "aciklama": "Endeks dahilindeki şirketlerin çeyreklik kümülatif net satış toplamı. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "3.450 Mr kr",
    "degisim": 21,
    "degisimEtiket": "Årlig endring",
    "tarih": "3. kvartal 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "seri": [
      {
        "etiket": "2025/3Ç",
        "deger": 2850
      },
      {
        "etiket": "2025/4Ç",
        "deger": 3020
      },
      {
        "etiket": "2026/1Ç",
        "deger": 3180
      },
      {
        "etiket": "2026/2Ç",
        "deger": 3320
      },
      {
        "etiket": "2026/3Ç",
        "deger": 3450
      }
    ],
    "mebiusTitle": "Revenue Overview Chart",
    "exportName": "RevenueOverviewChart",
    "mebiusFile": "revenue-overview-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-revenue-overview.webp",
    "hoydeKurve": 1,
    "kartbladRef": "N50-1900-I"
  },
  {
    "id": "charts-portfolio-allocation",
    "tur": "halka-pay",
    "kategori": "BOLIG & EIENDOM",
    "baslik": "Emeklilik Fonu Portföy Dağılımı (Norge)",
    "aciklama": "Uzun vadeli birikim sepetinde risk toleransına göre ağırlık dengesi. Offisiell statistikk fra norske myndigheter og fagorganer.",
    "metrik": "140.000 Birikim kr",
    "degisim": 9.5,
    "degisimEtiket": "Årlig endring",
    "tarih": "Oktober 2026",
    "kaynak": "Statistisk sentralbyrå (SSB)",
    "dilimler": [
      {
        "ad": "BIST 30 Endeks Fonu",
        "oran": 40,
        "renk": "vann"
      },
      {
        "ad": "Altın Katılım Fonu",
        "oran": 30,
        "renk": "blekk"
      },
      {
        "ad": "Kamu Dış Borçlanma",
        "oran": 20,
        "renk": "signalrod"
      },
      {
        "ad": "Para Piyasası Fonu",
        "oran": 10,
        "renk": "kontur"
      }
    ],
    "mebiusTitle": "Portfolio Allocation Chart",
    "exportName": "PortfolioAllocationChart",
    "mebiusFile": "portfolio-allocation-chart.tsx",
    "previewImage": "/kits/charts/previews/charts-portfolio-allocation.webp",
    "hoydeKurve": 2,
    "kartbladRef": "N50-1901-II"
  }
];

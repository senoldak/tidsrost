-- Ukesbrev (nyhetsbrev): abonnenter og utsendingslogg.
-- IP-adresse og nettleserdata lagres aldri. Avmeldte abonnenter slettes (rad fjernes).
-- Ubekreftede påmeldinger (durum = 'bekliyor') slettes etter 7 dager (bkz. worker/bulten.mjs).

CREATE TABLE abone (
  id INTEGER PRIMARY KEY,
  eposta TEXT UNIQUE NOT NULL,
  dil TEXT NOT NULL DEFAULT 'nb',
  durum TEXT NOT NULL CHECK(durum IN ('bekliyor','onayli')),
  belirtec TEXT UNIQUE NOT NULL,
  -- Bekliyor kayıtlarda: belirtecin ve onay e-postasının üretildiği an (10 dk gönderim aralığı, 7 gün geçerlilik).
  olusturma TEXT NOT NULL,
  onay TEXT
);

-- Aynı haftanın bülteni iki kez gönderilmesin diye.
CREATE TABLE gonderim (
  hafta TEXT NOT NULL,
  dil TEXT NOT NULL,
  zaman TEXT NOT NULL,
  adet INTEGER NOT NULL,
  PRIMARY KEY (hafta, dil)
);

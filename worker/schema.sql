-- «Var saken nyttig?»: anonym daglig telling per sak. Ingen IP, ingen leseropplysninger.
CREATE TABLE IF NOT EXISTS svar (
  dag TEXT NOT NULL,
  slug TEXT NOT NULL,
  svar TEXT NOT NULL CHECK (svar IN ('ja', 'nei')),
  antall INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (dag, slug, svar)
);

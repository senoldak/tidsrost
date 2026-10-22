export interface EntityMapping {
  name: string;
  type: 'Thing' | 'Organization' | 'Person';
  sameAs: string;
  keywords: string[];
}

export const NORWEGIAN_ENTITIES: EntityMapping[] = [
  {
    name: 'Stortinget',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q109016',
    keywords: [
      'Stortinget',
      'Stortingets',
      'Storting',
      'stortingsvalg',
      'stortingsvalget',
      'stortingsflertall',
      'stortingsrepresentant',
      'stortingsvedtak',
    ],
  },
  {
    name: 'Norges Bank',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q970769',
    keywords: [
      'Norges Bank',
      'Norges Banks',
      'sentralbanken',
      'sentralbankens',
    ],
  },
  {
    name: 'Meteorologisk institutt',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q665666',
    keywords: [
      'Meteorologisk institutt',
      'Meteorologisk Institutt',
      'MET',
      'METs',
      'Meteorologisk',
    ],
  },
  {
    name: 'Equinor',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q1776022',
    keywords: [
      'Equinor',
      'Equinors',
      'Statoil',
    ],
  },
  {
    name: 'Jonas Gahr Støre',
    type: 'Person',
    sameAs: 'https://www.wikidata.org/wiki/Q467948',
    keywords: [
      'Jonas Gahr Støre',
      'Jonas Gahr Støres',
      'Gahr Støre',
      'Gahr Støres',
      'statsminister Støre',
      'Statsminister Jonas Gahr Støre',
    ],
  },
  {
    name: 'NVE',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q3357659',
    keywords: [
      'NVE',
      'NVEs',
      'Norges vassdrags- og energidirektorat',
      'Vassdrags- og energidirektoratet',
    ],
  },
  {
    name: 'Oljefondet',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q1196231',
    keywords: [
      'Oljefondet',
      'Oljefondets',
      'Statens pensjonsfond utland',
      'NBIM',
    ],
  },
  {
    name: 'Statens vegvesen',
    type: 'Organization',
    sameAs: 'https://www.wikidata.org/wiki/Q1468793',
    keywords: [
      'Statens vegvesen',
      'Statens Vegvesen',
      'Vegvesenet',
      'Vegvesenets',
    ],
  },
];

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchEntities(
  text: string
): Array<{ '@type': string; name: string; sameAs: string }> {
  if (!text) return [];
  const matchedList: Array<{ '@type': string; name: string; sameAs: string }> = [];

  for (const ent of NORWEGIAN_ENTITIES) {
    const matched = ent.keywords.some((kw) => {
      const escaped = escapeRegex(kw);
      // For short keywords (like MET, NVE or <= 4 chars), strictly enforce start and end word-boundary
      // assertions with Unicode lookaround to prevent substring false positives (e.g. kilometer, metode, konvensjon).
      const isShort = kw.length <= 4;
      const pattern = isShort
        ? new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, 'ui')
        : new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'ui');
      return pattern.test(text);
    });

    if (matched) {
      matchedList.push({
        '@type': ent.type,
        name: ent.name,
        sameAs: ent.sameAs,
      });
    }
  }

  return matchedList.slice(0, 4);
}

export function findEntities(text: string) {
  const matched = matchEntities(text);
  return {
    about: matched.slice(0, 2),
    mentions: matched.slice(2),
  };
}

export function jsonLdMetni(veri: unknown): string;

export const KI_REDAKSJON_NAVN: string;
export const KI_REDAKSJON_URL: string;
export const EIER_URL: string;
export function kiRedaksjon(): Record<string, unknown>;
export function eierKisi(beskrivelse?: string): Record<string, unknown>;
export function haberAlanlari(girdi?: {
  produksjon?: string;
  kilder?: { navn: string; url: string }[];
  sted?: { navn: string; lat?: number; lon?: number };
  rettelse?: string;
  oppdatert?: Date | string;
  date?: Date | string;
  forfatter?: string;
  forfatterBeskrivelse?: string;
}): {
  dateModified?: string;
  author?: Record<string, unknown>;
  isBasedOn?: Record<string, unknown>[];
  contentLocation?: Record<string, unknown>;
  correction?: Record<string, unknown>;
};

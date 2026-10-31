export const SKALAER: string[];
export function skalaFra(lagret: string | number | null | undefined): '0' | '1' | '2' | '3';
export const FORTSETT_FRA: number;
export const FORTSETT_TIL: number;
export function fortsettFra(posisjon: number | string | null | undefined): number | null;
export function fremdrift(toppAvTekst: number, tekstHoyde: number, vindusHoyde: number): number;
export function velgStemme(stemmer: { lang: string }[]): number;
export function lagringsnokkel(sti: string): string;

export const KOBO_IN_NAIRA = 100;

export function nairaToKobo(amount: number) {
  return Math.round(amount * KOBO_IN_NAIRA);
}

export function koboToNaira(amount: number) {
  return amount / KOBO_IN_NAIRA;
}

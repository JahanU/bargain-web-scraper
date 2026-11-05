import type { Deal, Gender } from "./Deal";

export const NEW_FOR_MS = 2 * 60 * 60_000;

export const GENDER_LABEL: Record<Gender, string> = {
  Male: "Men",
  Female: "Women",
  Unisex: "Unisex",
};

/**
 * When the backend first saw each deal. Its clock restarts on every deploy, so the earliest batch
 * only says when the server started: those get no "found" time and are never new.
 */
export function foundTime(deal: Deal, serverStart: number): number | undefined {
  return deal.foundAt > serverStart ? deal.foundAt : undefined;
}

export function isNew(deal: Deal, serverStart: number, now = Date.now()): boolean {
  const found = foundTime(deal, serverStart);
  return found !== undefined && now - found < NEW_FOR_MS;
}

/** The backend's clock restarts on deploy, so the earliest first-seen time marks the server start. */
export function serverStartOf(deals: readonly Deal[]): number {
  return deals.reduce((earliest, deal) => Math.min(earliest, deal.foundAt), Infinity);
}

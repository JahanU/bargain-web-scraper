import type { Deal, Gender } from "./Deal";

export const NEW_FOR_MS = 2 * 60 * 60_000;

export const GENDER_LABEL: Record<Gender, string> = {
  Male: "Men",
  Female: "Women",
  Unisex: "Unisex",
};

/**
 * When the backend first saw each deal. Its clock restarts on every deploy, so the earliest batch
 * only says when the server started (the response's `trackingSince`): those get no "found" time
 * and are never new.
 */
export function foundTime(deal: Deal, serverStart: number): number | undefined {
  return deal.foundAt > serverStart ? deal.foundAt : undefined;
}

export function isNew(deal: Deal, serverStart: number, now = Date.now()): boolean {
  const found = foundTime(deal, serverStart);
  return found !== undefined && now - found < NEW_FOR_MS;
}

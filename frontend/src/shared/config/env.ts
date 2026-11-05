/** Checks VITE_API_URL once at boot, so a bad deploy fails loudly instead of fetching nonsense. */
export function readApiUrl(value: unknown): string {
  if (
    typeof value !== "string" ||
    !URL.canParse(value) ||
    !/^https?:$/.test(new URL(value).protocol)
  ) {
    throw new Error(
      `VITE_API_URL must be an http(s) URL, got ${JSON.stringify(value)}. See .env.example.`,
    );
  }
  return value.replace(/\/+$/, "");
}

export const apiUrl = readApiUrl(import.meta.env.VITE_API_URL);

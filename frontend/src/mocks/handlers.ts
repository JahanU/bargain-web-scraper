import { http, HttpResponse } from "msw";
import { apiUrl } from "@/shared/config/env";
import fixture from "@/test/fixtures/deals.json";
import { queryDeals } from "./api";

const API_URL = `${apiUrl}/v2/deals`;
// The backend's real headers (backend/src/http.ts).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Retry-After" };
const headers = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", ...CORS };

export const handlers = [
  http.get(API_URL, ({ request }) => {
    const { status, json } = queryDeals(fixture, new URL(request.url).searchParams);
    return HttpResponse.json(json, { status, headers });
  }),
];

/** Failure modes. In dev:mock pick one with ?mock=<name>; tests use them with server.use(). */
export const scenarios = {
  loading: http.get(API_URL, () =>
    HttpResponse.json(
      { error: "Deals are loading, try again shortly" },
      { status: 503, headers: { "Retry-After": "10", ...CORS } },
    ),
  ),
  "bad-gateway": http.get(
    API_URL,
    () =>
      new HttpResponse("<html><body>502 Bad Gateway</body></html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
  ),
  offline: http.get(API_URL, () => HttpResponse.error()),
};

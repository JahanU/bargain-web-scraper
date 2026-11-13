import { http, HttpResponse, type JsonBodyType } from "msw";
import { apiUrl } from "@/shared/config/env";
import fixture from "@/test/fixtures/deals.json";
import { brandCounts, filterDeals, hasValidStore } from "./api";

const API_URL = `${apiUrl}/v1/:resource`;
// The backend's real headers (backend/src/http.ts).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Retry-After" };
const headers = { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", ...CORS };

const answer =
  (body: (deals: typeof fixture, params: URLSearchParams) => JsonBodyType) =>
  ({ request }: { request: Request }) => {
    const params = new URL(request.url).searchParams;
    return hasValidStore(params)
      ? HttpResponse.json(body(fixture, params), { headers })
      : HttpResponse.json({ error: "Unknown store" }, { status: 400, headers: CORS });
  };

export const handlers = [
  http.get(`${apiUrl}/v1/deals`, answer(filterDeals)),
  http.get(`${apiUrl}/v1/brands`, answer(brandCounts)),
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

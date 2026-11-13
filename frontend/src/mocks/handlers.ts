import { http, HttpResponse } from "msw";
import { apiUrl } from "@/shared/config/env";
import fixture from "@/test/fixtures/deals.json";

const DEALS_URL = `${apiUrl}/v1/deals`;
// The backend's real headers (backend/src/http.ts).
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Expose-Headers": "Retry-After" };

export const handlers = [
  http.get(DEALS_URL, ({ request }) => {
    const gender = new URL(request.url).searchParams.get("gender");
    return HttpResponse.json(
      fixture.filter((deal) => gender === null || deal.gender === gender),
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300", ...CORS } },
    );
  }),
];

/** Failure modes. In dev:mock pick one with ?mock=<name>; tests use them with server.use(). */
export const scenarios = {
  loading: http.get(DEALS_URL, () =>
    HttpResponse.json(
      { error: "Deals are loading, try again shortly" },
      { status: 503, headers: { "Retry-After": "10", ...CORS } },
    ),
  ),
  "bad-gateway": http.get(
    DEALS_URL,
    () =>
      new HttpResponse("<html><body>502 Bad Gateway</body></html>", {
        status: 502,
        headers: { "Content-Type": "text/html" },
      }),
  ),
  offline: http.get(DEALS_URL, () => HttpResponse.error()),
};

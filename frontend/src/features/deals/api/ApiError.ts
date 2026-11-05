/**
 * - network: no response (offline, DNS, CORS, the server asleep and not answering)
 * - timeout: one attempt took longer than 20 s
 * - http: any non-OK status other than 503
 * - still-loading: the backend answered 503 until the two-minute deadline passed
 * - invalid-body: the body wasn't JSON, or wasn't an array
 */
export type ApiErrorKind = "network" | "timeout" | "http" | "still-loading" | "invalid-body";

export class ApiError extends Error {
  override name = "ApiError";
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;

  constructor(kind: ApiErrorKind, status?: number) {
    super(status ? `${kind} (${status})` : kind);
    this.kind = kind;
    this.status = status;
  }
}

import { getItemsService } from "./webScrape.service";

const item = { name: "Nike Air", wasPrice: 90, nowPrice: 45, discount: 50, url: "u", sizes: ["8"], timestamp: 1, gender: "Male" };

/** A minimal stand-in for fetch's Response. */
const reply = (status: number, body: unknown, retryAfter?: string) =>
  ({
    status,
    headers: { get: (name: string) => (name === "Retry-After" ? retryAfter ?? null : null) },
    json: async () => body,
  }) as unknown as Response;

describe("getItemsService", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("waits as the server asks and retries while it is still loading (503)", async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(reply(503, { error: "loading" }, "7"))
      .mockResolvedValueOnce(reply(200, [item]));
    global.fetch = fetchMock;
    const waits: number[] = [];

    const items = await getItemsService(async (ms) => { waits.push(ms); });

    expect(items).toEqual([item]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(waits).toEqual([7000]);
  });

  it("falls back to a default wait when Retry-After is missing or unreasonable", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce(reply(503, {}))
      .mockResolvedValueOnce(reply(503, {}, "99999"))
      .mockResolvedValueOnce(reply(200, [item]));
    const waits: number[] = [];

    await getItemsService(async (ms) => { waits.push(ms); });
    expect(waits).toEqual([10000, 10000]);
  });

  it("gives up after a few retries and returns the error body", async () => {
    const fetchMock = jest.fn().mockResolvedValue(reply(503, { error: "loading" }, "1"));
    global.fetch = fetchMock;

    expect(await getItemsService(async () => {})).toEqual({ error: "loading" });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not retry other responses", async () => {
    const fetchMock = jest.fn().mockResolvedValue(reply(200, [item]));
    global.fetch = fetchMock;

    await getItemsService(async () => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

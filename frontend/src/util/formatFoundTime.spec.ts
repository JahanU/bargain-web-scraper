import { formatFoundTime } from "./formatFoundTime";

describe("formatFoundTime", () => {
  const now = new Date(2026, 10, 3, 18, 0); // 3 Nov 2026, 18:00 local time

  it("shows only the time for items found today", () => {
    expect(formatFoundTime(new Date(2026, 10, 3, 14, 32).getTime(), now)).toBe("14:32");
  });

  it("adds the date for items found on an earlier day", () => {
    expect(formatFoundTime(new Date(2026, 9, 27, 9, 5).getTime(), now)).toBe("27 Oct, 09:05");
  });

  it("adds the date for yesterday late at night", () => {
    expect(formatFoundTime(new Date(2026, 10, 2, 23, 59).getTime(), now)).toBe("2 Nov, 23:59");
  });
});

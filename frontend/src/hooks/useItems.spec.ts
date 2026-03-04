import { renderHook, act } from "@testing-library/react-hooks";
import { useItems } from "./useItems";
import { getItemsService } from "../services/webScrape.service";
import Item from "../interfaces/Item";

jest.mock("../services/webScrape.service");

const mockGetItemsService = getItemsService as jest.MockedFunction<typeof getItemsService>;

const mockItems: Item[] = [
    {
        name: "Nike Air",
        wasPrice: "$90.00",
        nowPrice: "$70.00",
        discount: 22,
        url: "https://example.com/nike",
        sizes: ["M", "L"],
        timestamp: 1,
        gender: "Male",
    },
    {
        name: "Adidas Runner",
        wasPrice: "$80.00",
        nowPrice: "$55.00",
        discount: 31,
        url: "https://example.com/adidas",
        sizes: ["S"],
        timestamp: 2,
        gender: "Female",
    },
];

describe("useItems", () => {
    afterEach(() => jest.clearAllMocks());

    it("starts in loading state with no items and no error", () => {
        mockGetItemsService.mockReturnValue(new Promise(() => { })); // never resolves
        const { result } = renderHook(() => useItems());

        expect(result.current.isLoading).toBe(true);
        expect(result.current.items).toEqual([]);
        expect(result.current.isError).toBe(false);
    });

    it("resolves with items and sets loading to false on success", async () => {
        mockGetItemsService.mockResolvedValue(mockItems as any);
        const { result, waitForNextUpdate } = renderHook(() => useItems());

        await waitForNextUpdate();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.items).toEqual(mockItems);
        expect(result.current.isError).toBe(false);
    });

    it("sets isError when response is an empty array", async () => {
        mockGetItemsService.mockResolvedValue([] as any);
        const { result, waitForNextUpdate } = renderHook(() => useItems());

        await waitForNextUpdate();

        expect(result.current.isError).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.items).toEqual([]);
    });

    it("sets isError when response is not an array", async () => {
        mockGetItemsService.mockResolvedValue(null as any);
        const { result, waitForNextUpdate } = renderHook(() => useItems());

        await waitForNextUpdate();

        expect(result.current.isError).toBe(true);
        expect(result.current.isLoading).toBe(false);
    });

    it("sets isError when the service rejects", async () => {
        mockGetItemsService.mockRejectedValue(new Error("Network error"));
        const { result, waitForNextUpdate } = renderHook(() => useItems());

        await waitForNextUpdate();

        expect(result.current.isError).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.items).toEqual([]);
    });
});

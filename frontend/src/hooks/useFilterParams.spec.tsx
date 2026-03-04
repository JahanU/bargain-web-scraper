import { renderHook, act } from "@testing-library/react-hooks";
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { useFilterParams } from "./useFilterParams";
import { Sort } from "../interfaces/Sort";

function wrapper(initialUrl = "/") {
    return ({ children }: { children: React.ReactNode }) => (
        <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
    );
}

describe("useFilterParams — initial URL hydration", () => {
    it("returns empty defaults when URL has no params", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/"),
        });

        expect(result.current.search).toBe("");
        expect(result.current.sort).toBeNull();
        expect(result.current.sizes).toEqual([]);
    });

    it("reads sort from URL on mount", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper(`/?sort=${Sort.discountHighToLow}`),
        });

        expect(result.current.sort).toBe(Sort.discountHighToLow);
    });

    it("returns null sort for an invalid URL sort value", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/?sort=invalid-sort"),
        });

        expect(result.current.sort).toBeNull();
    });

    it("reads sizes from URL on mount", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/?sizes=S,M,L"),
        });

        expect(result.current.sizes).toEqual(["S", "M", "L"]);
    });

    it("reads search from URL on mount", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/?search=nike"),
        });

        expect(result.current.search).toBe("nike");
    });
});

describe("useFilterParams — setSort", () => {
    it("updates sort in URL when setSort is called", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/"),
        });

        act(() => {
            result.current.setSort(Sort.priceLowToHigh);
        });

        expect(result.current.sort).toBe(Sort.priceLowToHigh);
    });

    it("toggles sort off when the same sort value is set again", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper(`/?sort=${Sort.priceLowToHigh}`),
        });

        act(() => {
            result.current.setSort(Sort.priceLowToHigh);
        });

        expect(result.current.sort).toBeNull();
    });

    it("switches sort when a different sort value is set", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper(`/?sort=${Sort.priceLowToHigh}`),
        });

        act(() => {
            result.current.setSort(Sort.discountHighToLow);
        });

        expect(result.current.sort).toBe(Sort.discountHighToLow);
    });
});

describe("useFilterParams — toggleSize", () => {
    it("adds a size to the URL when toggled on", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/"),
        });

        act(() => {
            result.current.toggleSize("M");
        });

        expect(result.current.sizes).toContain("M");
    });

    it("removes a size from the URL when toggled off", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/?sizes=M,L"),
        });

        act(() => {
            result.current.toggleSize("M");
        });

        expect(result.current.sizes).not.toContain("M");
        expect(result.current.sizes).toContain("L");
    });

    it("can toggle multiple independent sizes", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/"),
        });

        act(() => {
            result.current.toggleSize("S");
        });

        act(() => {
            result.current.toggleSize("XL");
        });

        expect(result.current.sizes).toContain("S");
        expect(result.current.sizes).toContain("XL");
    });
});

describe("useFilterParams — setSearch (debounced)", () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it("updates local search immediately but does not write URL until debounce fires", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/"),
        });

        act(() => {
            result.current.setSearch("adidas");
        });

        // Local search updates instantly
        expect(result.current.search).toBe("adidas");

        // Advance past debounce window and flush pending state updates
        act(() => {
            jest.runAllTimers();
        });

        // After debounce, the search value is still correct
        expect(result.current.search).toBe("adidas");
    });

    it("cancels a pending debounce if setSearch is called again quickly", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/"),
        });

        act(() => {
            result.current.setSearch("adi");
        });

        act(() => {
            result.current.setSearch("adidas");
        });

        // Only the last value should be committed
        act(() => {
            jest.runAllTimers();
        });

        expect(result.current.search).toBe("adidas");
    });

    it("allows setting search to empty string", () => {
        const { result } = renderHook(() => useFilterParams(), {
            wrapper: wrapper("/?search=nike"),
        });

        act(() => {
            result.current.setSearch("");
        });

        expect(result.current.search).toBe("");
    });
});

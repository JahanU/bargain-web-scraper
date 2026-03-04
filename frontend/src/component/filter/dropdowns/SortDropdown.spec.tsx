import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SortDropdown from "./SortDropdown";
import * as useFilterParamsModule from "../../../hooks/useFilterParams";
import { Sort } from "../../../interfaces/Sort";

const mockSetSort = jest.fn();

function mockHook(sort: Sort | null = null) {
    jest.spyOn(useFilterParamsModule, "useFilterParams").mockReturnValue({
        search: "",
        sort,
        sizes: [],
        setSearch: jest.fn(),
        setSort: mockSetSort,
        toggleSize: jest.fn(),
    });
}

describe("SortDropdown", () => {
    afterEach(() => jest.restoreAllMocks());

    it("renders the Sort button", () => {
        mockHook();
        render(<SortDropdown />);
        expect(screen.getByRole("button", { name: /sort/i })).toBeInTheDocument();
    });

    it("renders all 4 sort options when opened", () => {
        mockHook();
        render(<SortDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sort/i }));

        expect(screen.getByText("Discount (High to Low)")).toBeInTheDocument();
        expect(screen.getByText("Discount (Low to High)")).toBeInTheDocument();
        expect(screen.getByText("Price (High to Low)")).toBeInTheDocument();
        expect(screen.getByText("Price (Low to High)")).toBeInTheDocument();
    });

    it("highlights the active sort option with indigo background", () => {
        mockHook(Sort.discountHighToLow);
        render(<SortDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sort/i }));

        const activeButton = screen.getByText("Discount (High to Low)");
        expect(activeButton).toHaveClass("bg-indigo-400");
    });

    it("does not highlight inactive sort options", () => {
        mockHook(Sort.discountHighToLow);
        render(<SortDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sort/i }));

        const inactiveButton = screen.getByText("Price (Low to High)");
        expect(inactiveButton).toHaveClass("bg-gray-100");
        expect(inactiveButton).not.toHaveClass("bg-indigo-400");
    });

    it("calls setSort with the correct Sort value when an option is clicked", () => {
        mockHook(null);
        render(<SortDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sort/i }));
        fireEvent.click(screen.getByText("Price (High to Low)"));

        expect(mockSetSort).toHaveBeenCalledWith(Sort.priceHighToLow);
    });

    it("calls setSort with the active sort to trigger toggle-off", () => {
        mockHook(Sort.priceLowToHigh);
        render(<SortDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sort/i }));
        fireEvent.click(screen.getByText("Price (Low to High)"));

        expect(mockSetSort).toHaveBeenCalledWith(Sort.priceLowToHigh);
    });

    it("no option is highlighted when sort is null", () => {
        mockHook(null);
        render(<SortDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sort/i }));

        const allOptions = screen.getAllByRole("button").slice(1); // skip the trigger button
        allOptions.forEach((btn) => {
            expect(btn).not.toHaveClass("bg-indigo-400");
        });
    });
});

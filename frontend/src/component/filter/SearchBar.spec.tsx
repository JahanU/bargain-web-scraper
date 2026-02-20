import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SearchBar from "./SearchBar";
import * as useFilterParamsModule from "../../hooks/useFilterParams";
import { Sort } from "../../interfaces/Sort";

const mockSetSearch = jest.fn();

function mockHook(search = "") {
    jest.spyOn(useFilterParamsModule, "useFilterParams").mockReturnValue({
        search,
        sort: null,
        sizes: [],
        setSearch: mockSetSearch,
        setSort: jest.fn(),
        toggleSize: jest.fn(),
    });
}

describe("SearchBar", () => {
    afterEach(() => jest.restoreAllMocks());

    it("renders a search input", () => {
        mockHook();
        render(<SearchBar />);
        expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    it("renders with empty value when search is empty", () => {
        mockHook("");
        render(<SearchBar />);
        expect(screen.getByRole("searchbox")).toHaveValue("");
    });

    it("renders with the current search value from the hook", () => {
        mockHook("nike");
        render(<SearchBar />);
        expect(screen.getByRole("searchbox")).toHaveValue("nike");
    });

    it("calls setSearch with the typed value when input changes", () => {
        mockHook("");
        render(<SearchBar />);
        fireEvent.change(screen.getByRole("searchbox"), {
            target: { value: "adidas" },
        });
        expect(mockSetSearch).toHaveBeenCalledWith("adidas");
    });

    it("calls setSearch with empty string when input is cleared", () => {
        mockHook("nike");
        render(<SearchBar />);
        fireEvent.change(screen.getByRole("searchbox"), {
            target: { value: "" },
        });
        expect(mockSetSearch).toHaveBeenCalledWith("");
    });

    it("displays placeholder text", () => {
        mockHook();
        render(<SearchBar />);
        expect(
            screen.getByPlaceholderText("Search for items and brands")
        ).toBeInTheDocument();
    });
});

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SizeDropdown from "./SizeDropdown";
import * as useFilterParamsModule from "../../../hooks/useFilterParams";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const mockToggleSize = jest.fn();

function mockHook(sizes: string[] = []) {
    jest.spyOn(useFilterParamsModule, "useFilterParams").mockReturnValue({
        search: "",
        sort: null,
        sizes,
        setSearch: jest.fn(),
        setSort: jest.fn(),
        toggleSize: mockToggleSize,
    });
}

describe("SizeDropdown", () => {
    afterEach(() => jest.restoreAllMocks());

    it("renders the Sizes button", () => {
        mockHook();
        render(<SizeDropdown />);
        expect(screen.getByRole("button", { name: /sizes/i })).toBeInTheDocument();
    });

    it("renders all available sizes when opened", () => {
        mockHook();
        render(<SizeDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sizes/i }));

        AVAILABLE_SIZES.forEach((size) => {
            expect(screen.getByText(size)).toBeInTheDocument();
        });
    });

    it("highlights selected sizes with indigo background", () => {
        mockHook(["M", "L"]);
        render(<SizeDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sizes/i }));

        expect(screen.getByText("M")).toHaveClass("bg-indigo-400");
        expect(screen.getByText("L")).toHaveClass("bg-indigo-400");
    });

    it("does not highlight unselected sizes", () => {
        mockHook(["M"]);
        render(<SizeDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sizes/i }));

        expect(screen.getByText("S")).toHaveClass("bg-gray-100");
        expect(screen.getByText("S")).not.toHaveClass("bg-indigo-400");
    });

    it("highlights no sizes when sizes array is empty", () => {
        mockHook([]);
        render(<SizeDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sizes/i }));

        const allOptions = screen.getAllByRole("button").slice(1);
        allOptions.forEach((btn) => {
            expect(btn).not.toHaveClass("bg-indigo-400");
        });
    });

    it("calls toggleSize with the correct size when clicked", () => {
        mockHook([]);
        render(<SizeDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sizes/i }));
        fireEvent.click(screen.getByText("XL"));

        expect(mockToggleSize).toHaveBeenCalledWith("XL");
    });

    it("calls toggleSize to deselect an already-selected size", () => {
        mockHook(["XL"]);
        render(<SizeDropdown />);
        fireEvent.click(screen.getByRole("button", { name: /sizes/i }));
        fireEvent.click(screen.getByText("XL"));

        expect(mockToggleSize).toHaveBeenCalledWith("XL");
    });
});

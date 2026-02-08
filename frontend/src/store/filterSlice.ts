import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FilterState {
  discount: number;
  search: string;
  latest: boolean;
  discountHighToLow: boolean | null;
  priceHighToLow: boolean | null;
  gender: boolean | null;
  sizes: string[];
}

const initialFilterState: FilterState = {
  discount: 0,
  search: "",
  latest: false,
  discountHighToLow: null,
  priceHighToLow: null,
  gender: null,
  sizes: [],
};

function toggleSortSelection(currentValue: boolean | null, nextValue: boolean): boolean | null {
  return currentValue === nextValue ? null : nextValue;
}

const filter = createSlice({
  name: "filter",
  initialState: initialFilterState,
  reducers: {
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload.toLowerCase();
    },
    setLatset: (state) => {
      state.latest = !state.latest;
    },
    setDiscountHighToLow: (state, action: PayloadAction<boolean>) => {
      state.discountHighToLow = toggleSortSelection(state.discountHighToLow, action.payload);
      state.priceHighToLow = null;
    },
    setPriceHighToLow: (state, action: PayloadAction<boolean>) => {
      state.priceHighToLow = toggleSortSelection(state.priceHighToLow, action.payload);
      state.discountHighToLow = null;
    },
    setGender: (state, action: PayloadAction<boolean | null>) => {
      state.gender = action.payload;
    },
    setSizes: (state, action: PayloadAction<string>) => {
      if (state.sizes.includes(action.payload)) {
        state.sizes = state.sizes.filter((size) => size !== action.payload);
      } else {
        state.sizes.push(action.payload);
      }
    },
    setAllSizes: (state, action: PayloadAction<string[]>) => {
      state.sizes = action.payload;
    },
  },
});

export const filterActions = filter.actions;
export default filter;

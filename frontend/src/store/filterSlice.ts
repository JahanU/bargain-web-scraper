import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Sort } from "../interfaces/Sort";

interface QueryFilterState {
  search: string;
  sort: Sort | null;
  sizes: string[];
}

interface FilterState extends QueryFilterState {
  discount: number;
  gender: boolean | null;
}

const initialFilterState: FilterState = {
  discount: 0,
  search: "",
  sort: null,
  gender: null,
  sizes: [],
};

const filter = createSlice({
  name: "filter",
  initialState: initialFilterState,
  reducers: {
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },
    setSort: (state, action: PayloadAction<Sort | null>) => {
      if (action.payload === null) {
        state.sort = null;
        return;
      }

      state.sort = state.sort === action.payload ? null : action.payload;
    },
    setGender: (state, action: PayloadAction<boolean | null>) => {
      state.gender = action.payload;
    },
    toggleSize: (state, action: PayloadAction<string>) => {
      if (state.sizes.includes(action.payload)) {
        state.sizes = state.sizes.filter((size) => size !== action.payload);
      } else {
        state.sizes.push(action.payload);
      }
    },
    hydrateFromQuery: (state, action: PayloadAction<QueryFilterState>) => {
      state.search = action.payload.search;
      state.sort = action.payload.sort;
      state.sizes = action.payload.sizes;
    },
  },
});

export const filterActions = filter.actions;
export default filter;

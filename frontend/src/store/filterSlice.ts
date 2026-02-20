import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface FilterState {
  discount: number;
}

const initialFilterState: FilterState = {
  discount: 0,
};

const filter = createSlice({
  name: "filter",
  initialState: initialFilterState,
  reducers: {
    setDiscount: (state, action: PayloadAction<number>) => {
      state.discount = action.payload;
    },
  },
});

export const filterActions = filter.actions;
export default filter;

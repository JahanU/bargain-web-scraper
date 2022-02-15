import { createSlice } from '@reduxjs/toolkit';

const initalFilterState = {
    search: '',
    latest: false,
    discountHighToLow: false,
    priceHighToLow: false,
}

const filter = createSlice({
    name: 'filter',
    initialState: initalFilterState,
    reducers: {
        setSearch: (state, action) => {
            state.search = action.payload;
        },
        setLatset: (state) => {
            state.latest = !state.latest;
        },
        setDiscountHighToLow: (state) => {
            state.discountHighToLow = !state.discountHighToLow;
        },
        setPriceHighToLow: (state) => {
            state.priceHighToLow = !state.priceHighToLow;
        }
    },
});

export const filterActions = filter.actions;
export default filter;
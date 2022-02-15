import { createSlice } from '@reduxjs/toolkit';

const initalFilterState = {
    search: '',
    latest: false,
    discountHighToLow: true, // Default we sort in Desc Order
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
        setDiscountHighToLow: (state, action) => {
            state.discountHighToLow = action.payload;
        },
        setPriceHighToLow: (state, action) => {
            state.priceHighToLow = action.payload;
        }
    },
});

export const filterActions = filter.actions;
export default filter;
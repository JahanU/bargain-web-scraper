import { createSlice } from '@reduxjs/toolkit';

const initalFilterState = {
    discount: 0,
    search: '',
    latest: false,
    discountHighToLow: null, // Default we sort in Desc Order
    priceHighToLow: null,
    gender: null, // true = male, false = female
    sort: ''
}

const filter = createSlice({
    name: 'filter',
    initialState: initalFilterState,
    reducers: {
        setDiscount: (state, action) => {
            state.discount = action.payload;
        },
        setSearch: (state, action) => {
            state.search = action.payload.toLowerCase();
        },
        setLatset: (state) => {
            state.latest = !state.latest;
        },
        setDiscountHighToLow: (state, action) => {
            state.discountHighToLow = action.payload;
        },
        setPriceHighToLow: (state, action) => {
            state.priceHighToLow = action.payload;
        },
        setGender: (state, action) => {
            state.gender = action.payload;
        },
        sortParams: (state, action) => {
            state.sort = action.payload;
        }
    },
});

export const filterActions = filter.actions;
export default filter;
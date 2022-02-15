import { createSlice } from '@reduxjs/toolkit';

const initalFilterState = {
    search: '',
    sortAscToDesc: false,
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
        setSortAscToDesc: (state, action) => {
            state.sortAscToDesc = action.payload;
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
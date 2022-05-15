import { createSlice } from '@reduxjs/toolkit';

const initalFilterState = {
    discount: 0,
    search: '',
    latest: false,
    discountHighToLow: null, // Default we sort in Desc Order
    priceHighToLow: null,
    gender: null, // true = male, false = female
    sizes: [],
}

const filter = createSlice({
    name: 'filter',
    initialState: initalFilterState,
    reducers: {
        setDiscount: (state: { discount: any; }, action: { payload: any; }) => {
            state.discount = action.payload;
        },
        setSearch: (state: { search: string }, action: { payload: string; }) => {
            state.search = action.payload.toLowerCase();
        },
        setLatset: (state: { latest: boolean; }) => {
            state.latest = !state.latest;
        },
        setDiscountHighToLow: (state: { discountHighToLow: any; }, action: { payload: any; }) => {
            state.discountHighToLow = action.payload;
        },
        setPriceHighToLow: (state: { priceHighToLow: any; }, action: { payload: any; }) => {
            state.priceHighToLow = action.payload;
        },
        setGender: (state: { gender: any; }, action: { payload: any; }) => {
            state.gender = action.payload;
        },
        setSize: (state: { sizes: any[]; }, action: { payload: string; }) => {
            // todo if already in size, we remove. else we add
            if (state.sizes.includes(action.payload))
                state.sizes = state.sizes.filter((s: string) => s !== action.payload);
            else
                state.sizes.push(action.payload);
        },
    }
});

export const filterActions = filter.actions;
export default filter;
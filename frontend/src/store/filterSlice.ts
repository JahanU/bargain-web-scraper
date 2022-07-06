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
        setDiscountHighToLow: (state: { discountHighToLow: any; priceHighToLow: any }, action: { payload: any; }) => {
            // already selected, now we unselect it
            if (state.discountHighToLow && action.payload)
                state.discountHighToLow = null;
            else if (state.discountHighToLow === false && !action.payload)
                state.discountHighToLow = null;
            else
                state.discountHighToLow = action.payload;

            state.priceHighToLow = null;
        },
        setPriceHighToLow: (state: { priceHighToLow: any; discountHighToLow: any }, action: { payload: any; }) => {
            // already selected, now we unselect it
            if (state.priceHighToLow && action.payload)
                state.priceHighToLow = null;
            else if (state.priceHighToLow === false && !action.payload)
                state.priceHighToLow = null;
            else
                state.priceHighToLow = action.payload;

            state.discountHighToLow = null;
        },
        setGender: (state: { gender: any; }, action: { payload: any; }) => {
            state.gender = action.payload;
        },
        setSizes: (state: { sizes: any[]; }, action: { payload: string; }) => {
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
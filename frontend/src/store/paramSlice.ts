import { createSlice } from '@reduxjs/toolkit';

const initialParamState = {
    discountParam: 10,
    sortParams: '',
    searchInputParams: '',
    genderParams: '',
    sizesParams: ''
}

const param = createSlice({
    name: 'param',
    initialState: initialParamState,
    reducers: {
        setDiscountParam: (state, action) => {
            state.discountParam = action.payload;
        },
        setSortParams: (state, action) => {
            state.sortParams = action.payload;
        },
        setSearchInputParams: (state, action) => {
            state.searchInputParams = action.payload;
        },
        setSizesParams: (state, action) => {
            state.sizesParams = action.payload;
        },
        setGenderParams: (state, action) => {
            state.genderParams = action.payload;
        }
    }
});

export const paramActions = param.actions;
export default param;
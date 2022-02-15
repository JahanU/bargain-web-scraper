import { configureStore } from '@reduxjs/toolkit';
import filterSlice from './filterSlice';

const store = configureStore({
    reducer: {
        filterStore: filterSlice.reducer,
    }
});

export default store;
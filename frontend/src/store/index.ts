import { configureStore } from '@reduxjs/toolkit';
import filterSlice from './filterSlice';
import paramSlice from './paramSlice';

const store = configureStore({
    reducer: {
        filterStore: filterSlice.reducer,
        paramStore: paramSlice.reducer
    }
});

export default store;
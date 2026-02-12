import { configureStore } from '@reduxjs/toolkit';
import filterSlice from './filterSlice';

const store = configureStore({
    reducer: {
        filterStore: filterSlice.reducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

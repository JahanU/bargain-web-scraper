// import { createStore } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
// import counter from './counter';
// import auth from './auth';

const store = configureStore({
    reducer: {
        // counterStore: counter.reducer,
        // authStore: auth.reducer
    }
});

export default store;
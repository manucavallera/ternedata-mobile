import { configureStore } from '@reduxjs/toolkit';
import { authSlice } from './auth/authSlice';
import { businessSlice } from './bussines/businessSlice';

export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        business: businessSlice.reducer,
    },
});

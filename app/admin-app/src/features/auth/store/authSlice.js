// features/auth/store/authSlice.js

import { createSlice } from "@reduxjs/toolkit";
import { getToken, getUser } from "../services/authStorage";

const initialState = {
  token: getToken() || null,
  user: getUser() || null,
  isAuthenticated: !!getToken(),
};

const authSlice = createSlice({
  name: "auth",

  initialState,

  reducers: {
    setCredentials: (state, action) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;

export default authSlice.reducer;
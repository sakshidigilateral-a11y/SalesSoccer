import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface AuthSlice {
  mrId: string | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthSlice = {
  mrId: null,
  token: null,
  role: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{mrId: string; token: string; role: string}>,
    ) => {
      state.mrId = action.payload.mrId;
      state.token = action.payload.token;
      state.role = action.payload.role;
      state.isAuthenticated = true;
    },

    logout: state => {
      state.mrId = null;
      state.token = null;
      state.role = null;
      state.isAuthenticated = false;
    },
  },
});

export const {setCredentials, logout} = authSlice.actions;
export default authSlice.reducer;

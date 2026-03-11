import {configureStore, combineReducers} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {persistStore, persistReducer} from 'redux-persist';
import authReducer from './authSlice';
import playerReducer from './playerSlice'; // ✅ Import

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'player'], // ✅ Add player to persist
};

const rootReducer = combineReducers({
  auth: authReducer,
  player: playerReducer, // ✅ Add here
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; // ✅ Add this


import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface PlayerStats {
  mrName?: string;
  flmName?: string;
  userId: string;
  userName: string;
  teamName: string;
  totalGoals: number;
  totalMatches: number;
  totalApprovedUploads: number;
  currentCounter?: number;
  isGoal?: boolean;
  wins: number;
  losses: number;
  draws: number;
  fastestGoalTime: number | null;
  averageTimePerGoal: number | null;
  matchesWithHighestPrescriptions: number;
}

interface PlayerSlice {
  stats: PlayerStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: PlayerSlice = {
  stats: null,
  loading: false,
  error: null,
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    setPlayerStats: (state, action: PayloadAction<PlayerStats>) => {
  const incoming = action.payload;

  if (!state.stats) {
    state.stats = incoming;
    return;
  }

  const currentCounter = state.stats.currentCounter ?? 0;
  const incomingCounter = incoming.currentCounter ?? currentCounter;

  const currentGoals = state.stats.totalGoals ?? 0;
  const incomingGoals = incoming.totalGoals ?? currentGoals;

  state.stats = {
    ...state.stats,
    ...incoming,

    // Never let counter go backwards
    currentCounter:
      incomingCounter >= currentCounter
        ? incomingCounter
        : currentCounter,

    // Never let goals go backwards for MR
    totalGoals:
      incomingGoals >= currentGoals
        ? incomingGoals
        : currentGoals,
  };

  state.loading = false;
  state.error = null;
},
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearPlayerStats: state => {
      state.stats = null;
      state.loading = false;
      state.error = null;
    },
    // ✅ Add incremental update reducers
    updateGoalCount: (state, action: PayloadAction<number>) => {
      if (state.stats) {
        state.stats.totalGoals = action.payload;
      }
    },
    updatePossessionCount: (state, action: PayloadAction<number>) => {
      if (state.stats) {
        state.stats.totalApprovedUploads = action.payload;
      }
    },
    incrementGoal: state => {
      if (state.stats) {
        state.stats.totalGoals += 1;

        const maxGoals = 7;
        const remainder = state.stats.totalGoals % maxGoals;

        state.stats.currentCounter = remainder === 0 ? maxGoals : remainder;

        state.stats.isGoal = state.stats.totalGoals % maxGoals === 0;
      }
    },
    updateFromBackend: (state, action) => {
      if (!state.stats) return;
      Object.assign(state.stats, action.payload);
    },
    incrementPossession: state => {
      if (state.stats) {
        state.stats.totalApprovedUploads += 1;
      }
    },
  },
});

export const {
  setPlayerStats,
  setLoading,
  setError,
  clearPlayerStats,
  updateGoalCount,
  updatePossessionCount,
  incrementGoal,
  updateFromSocket,
  updateFromBackend,
  incrementPossession,
} = playerSlice.actions;

export default playerSlice.reducer;

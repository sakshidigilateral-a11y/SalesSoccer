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

      // ✅ If userIds are different, ALWAYS accept the new data
      if (!state.stats || state.stats.userId !== incoming.userId) {
        state.stats = incoming;
        state.loading = false;
        state.error = null;
        return;
      }

      // Same user — apply your existing staleness check
      const isNewerGoal = incoming.totalGoals > state.stats.totalGoals;
      const isSameGoalButHigherCounter =
        incoming.totalGoals === state.stats.totalGoals &&
        (incoming.currentCounter ?? 0) >= (state.stats.currentCounter ?? 0);

      if (isNewerGoal || isSameGoalButHigherCounter) {
        state.stats = {...state.stats, ...incoming};
      } else {
        console.log('Ignored outdated stats from API');
      }

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

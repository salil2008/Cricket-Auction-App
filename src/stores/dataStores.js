import { create } from 'zustand';
import { 
  teamOperations, 
  playerOperations, 
  configOperations,
  initializeConfig,
  resetAuctionData
} from '../db';

// ============================================
// TEAMS STORE
// ============================================
export const useTeamStore = create((set, get) => ({
  teams: [],
  loading: false,
  error: null,
  
  fetchTeams: async () => {
    set({ loading: true, error: null });
    try {
      const teams = await teamOperations.getAll();
      set({ teams, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  getTeamById: (id) => {
    return get().teams.find(t => t.id === id);
  },
  
  addTeam: async (team) => {
    set({ loading: true, error: null });
    try {
      const newTeam = await teamOperations.create(team);
      set(state => ({ 
        teams: [...state.teams, newTeam],
        loading: false 
      }));
      return newTeam;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  updateTeam: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await teamOperations.update(id, updates);
      set(state => ({
        teams: state.teams.map(t => t.id === id ? updated : t),
        loading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  deleteTeam: async (id) => {
    set({ loading: true, error: null });
    try {
      await teamOperations.delete(id);
      set(state => ({
        teams: state.teams.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  refreshTeam: async (id) => {
    try {
      const team = await teamOperations.getById(id);
      if (team) {
        set(state => ({
          teams: state.teams.map(t => t.id === id ? team : t)
        }));
      }
      return team;
    } catch (error) {
      console.error('Error refreshing team:', error);
    }
  },
  
  // Reset all team purses (for auction reset)
  resetAllPurses: async () => {
    const teams = await teamOperations.getAll();
    set({ teams });
  },
  
  // Retain a player to a team
  retainPlayer: async (teamId, playerId, retentionPrice) => {
    set({ loading: true, error: null });
    try {
      const result = await teamOperations.retainPlayer(teamId, playerId, retentionPrice);
      // Refresh both stores
      const teams = await teamOperations.getAll();
      set({ teams, loading: false });
      // Also refresh players store
      const players = await playerOperations.getAll();
      usePlayerStore.setState({ players });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Release a retained player
  releaseRetainedPlayer: async (teamId, playerId) => {
    set({ loading: true, error: null });
    try {
      const result = await teamOperations.releaseRetainedPlayer(teamId, playerId);
      // Refresh both stores
      const teams = await teamOperations.getAll();
      set({ teams, loading: false });
      // Also refresh players store
      const players = await playerOperations.getAll();
      usePlayerStore.setState({ players });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Get retained players for a team
  getRetainedPlayers: (teamId) => {
    const players = usePlayerStore.getState().players;
    return players.filter(p => p.isRetained && p.retainedByTeamId === teamId);
  }
}));

// ============================================
// PLAYERS STORE
// ============================================
export const usePlayerStore = create((set, get) => ({
  players: [],
  loading: false,
  error: null,
  
  fetchPlayers: async () => {
    set({ loading: true, error: null });
    try {
      const players = await playerOperations.getAll();
      set({ players, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  getPlayerById: (id) => {
    return get().players.find(p => p.id === id);
  },
  
  getPlayersByStatus: (status) => {
    return get().players.filter(p => p.status === status);
  },
  
  getPlayersByTier: (tier) => {
    return get().players.filter(p => p.tier === tier);
  },
  
  getPlayersByTeam: (teamId) => {
    return get().players.filter(p => p.soldToTeamId === teamId);
  },
  
  // Get players available for auction (available OR unsold for re-auction)
  getAuctionablePlayers: () => {
    return get().players.filter(p => p.status === 'available' || p.status === 'unsold');
  },
  
  addPlayer: async (player) => {
    set({ loading: true, error: null });
    try {
      const newPlayer = await playerOperations.create(player);
      set(state => ({ 
        players: [...state.players, newPlayer],
        loading: false 
      }));
      return newPlayer;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  updatePlayer: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await playerOperations.update(id, updates);
      set(state => ({
        players: state.players.map(p => p.id === id ? updated : p),
        loading: false
      }));
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  deletePlayer: async (id) => {
    set({ loading: true, error: null });
    try {
      await playerOperations.delete(id);
      set(state => ({
        players: state.players.filter(p => p.id !== id),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  markPlayerSold: async (id, teamId, soldPrice) => {
    try {
      const updated = await playerOperations.markSold(id, teamId, soldPrice);
      set(state => ({
        players: state.players.map(p => p.id === id ? updated : p)
      }));
      return updated;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  markPlayerUnsold: async (id) => {
    try {
      const updated = await playerOperations.markUnsold(id);
      set(state => ({
        players: state.players.map(p => p.id === id ? updated : p)
      }));
      return updated;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  // Reset single player to available (for re-auction)
  resetPlayer: async (id) => {
    try {
      const updated = await playerOperations.resetToAvailable(id);
      set(state => ({
        players: state.players.map(p => p.id === id ? updated : p)
      }));
      return updated;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  // Re-auction an unsold player (set back to available)
  reAuctionPlayer: async (id) => {
    const player = get().players.find(p => p.id === id);
    if (!player || player.status !== 'unsold') {
      throw new Error('Player is not unsold');
    }
    try {
      const updated = await playerOperations.resetToAvailable(id);
      set(state => ({
        players: state.players.map(p => p.id === id ? updated : p)
      }));
      return updated;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
  
  bulkAddPlayers: async (players) => {
    set({ loading: true, error: null });
    try {
      await playerOperations.bulkCreate(players);
      const allPlayers = await playerOperations.getAll();
      set({ players: allPlayers, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  refreshPlayer: async (id) => {
    try {
      const player = await playerOperations.getById(id);
      if (player) {
        set(state => ({
          players: state.players.map(p => p.id === id ? player : p)
        }));
      }
      return player;
    } catch (error) {
      console.error('Error refreshing player:', error);
    }
  },
  
  // Bulk update photos from file upload
  bulkUpdatePhotos: async (photoMappings) => {
    set({ loading: true, error: null });
    try {
      await playerOperations.bulkUpdatePhotos(photoMappings);
      const players = await playerOperations.getAll();
      set({ players, loading: false });
      return players;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Get players available for auction (excludes retained)
  getAuctionablePlayers: () => {
    return get().players.filter(p => 
      !p.isRetained && (p.status === 'available' || p.status === 'unsold')
    );
  },
  
  // Get retained players
  getRetainedPlayers: () => {
    return get().players.filter(p => p.isRetained);
  }
}));

// ============================================
// CONFIG STORE
// ============================================
export const useConfigStore = create((set) => ({
  config: null,
  loading: false,
  error: null,
  
  fetchConfig: async () => {
    set({ loading: true, error: null });
    try {
      await initializeConfig();
      const config = await configOperations.get();
      set({ config, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },
  
  updateConfig: async (updates) => {
    set({ loading: true, error: null });
    try {
      const updated = await configOperations.update(updates);
      set({ config: updated, loading: false });
      return updated;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  resetConfig: async () => {
    set({ loading: true, error: null });
    try {
      const config = await configOperations.reset();
      set({ config, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  getTierConfig: (tierId) => {
    const config = useConfigStore.getState().config;
    if (!config) return null;
    return config.tiers.find(t => t.id === tierId);
  }
}));

// ============================================
// GLOBAL RESET FUNCTION
// ============================================
export async function resetFullAuction() {
  // Reset database auction data
  const result = await resetAuctionData();
  
  // Refresh all stores
  const players = await playerOperations.getAll();
  const teams = await teamOperations.getAll();
  
  usePlayerStore.setState({ players });
  useTeamStore.setState({ teams });
  
  return result;
}
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auction event types
export const AUCTION_EVENTS = {
  AUCTION_START: 'auction/start',
  AUCTION_PAUSE: 'auction/pause',
  AUCTION_RESUME: 'auction/resume',
  AUCTION_END: 'auction/end',
  PLAYER_SELECT: 'player/select',
  PLAYER_SOLD: 'player/sold',
  PLAYER_UNSOLD: 'player/unsold',
  BID_UPDATE: 'bid/update',
  BID_TEAM_HIGHLIGHT: 'bid/highlight',
  VIEW_CHANGE: 'view/change',
  SOUND_PLAY: 'sound/play',
  AUCTION_RESET: 'auction/reset'
};

// Presentation views
export const VIEWS = {
  AUCTION: 'auction',
  TEAMS: 'teams',
  POOL: 'pool',
  SPLASH: 'splash',
  BREAK: 'break'
};

// Generate unique event ID
let eventCounter = 0;
const generateEventId = () => `evt_${Date.now()}_${++eventCounter}`;

const initialState = {
  // Auction lifecycle
  isLive: false,
  isPaused: false,
  auctionStartedAt: null,
  
  // Current player being auctioned
  currentPlayerId: null,
  currentBid: 0,
  currentBiddingTeamId: null,
  
  // Presentation control
  activeView: VIEWS.SPLASH,
  
  // Last event (for animation triggers) - now with unique ID
  lastEvent: null,
  lastEventId: null, // Separate field for reliable change detection
  
  // Queue management
  playerQueue: [],
  queueIndex: 0,
  
  // Round tracking
  currentRound: 1,
  currentTier: null,
  
  // Sound control
  soundEnabled: true,
  
  // Pool view filters
  poolFilter: 'all', // all, available, sold, unsold
  poolTierFilter: null, // null = all tiers
  
  // Configurable bid increments (can be overridden by config)
  bidIncrements: [100, 200, 500, 1000, 2000],
  
  // Auto-increment thresholds for team click bidding
  // Format: [{ upTo: threshold, increment: amount }, ...]
  autoIncrementRules: [
    { upTo: 400, increment: 10 },
    { upTo: 750, increment: 25 },
    { upTo: 1400, increment: 50 },
    { upTo: 2500, increment: 100 },
    { upTo: Infinity, increment: 250 }
  ]
};

export const useAuctionStore = create(
  persist(
    (set, get) => ({
      ...initialState,
      
      // Helper to create and dispatch event
      _dispatchEvent: (type, payload = {}) => {
        const eventId = generateEventId();
        const event = {
          id: eventId,
          type,
          payload,
          timestamp: Date.now()
        };
        set({ lastEvent: event, lastEventId: eventId });
        return event;
      },
      
      // Auction lifecycle actions
      startAuction: () => {
        const eventId = generateEventId();
        set({
          isLive: true,
          isPaused: false,
          auctionStartedAt: Date.now(),
          activeView: VIEWS.AUCTION,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.AUCTION_START,
            payload: {},
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      pauseAuction: () => {
        const eventId = generateEventId();
        set({
          isPaused: true,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.AUCTION_PAUSE,
            payload: {},
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      resumeAuction: () => {
        const eventId = generateEventId();
        set({
          isPaused: false,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.AUCTION_RESUME,
            payload: {},
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      endAuction: () => {
        const eventId = generateEventId();
        set({
          isLive: false,
          isPaused: false,
          activeView: VIEWS.SPLASH,
          currentPlayerId: null,
          currentBid: 0,
          currentBiddingTeamId: null,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.AUCTION_END,
            payload: {},
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Player selection
      selectPlayer: (playerId, basePrice) => {
        const eventId = generateEventId();
        set({
          currentPlayerId: playerId,
          currentBid: basePrice,
          currentBiddingTeamId: null,
          activeView: VIEWS.AUCTION,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.PLAYER_SELECT,
            payload: { playerId, basePrice },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Bid updates - now with team association
      updateBid: (amount, teamId = null) => {
        const eventId = generateEventId();
        const newState = {
          currentBid: amount,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.BID_UPDATE,
            payload: { amount, teamId },
            timestamp: Date.now()
          },
          lastEventId: eventId
        };
        // Only update team if provided
        if (teamId !== null) {
          newState.currentBiddingTeamId = teamId;
        }
        set(newState);
      },
      
      // Increment bid with team association
      incrementBid: (increment, teamId = null) => {
        const { currentBid, currentBiddingTeamId } = get();
        const newBid = currentBid + increment;
        const eventId = generateEventId();
        set({
          currentBid: newBid,
          currentBiddingTeamId: teamId !== null ? teamId : currentBiddingTeamId,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.BID_UPDATE,
            payload: { amount: newBid, teamId: teamId !== null ? teamId : currentBiddingTeamId },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      highlightTeam: (teamId) => {
        const eventId = generateEventId();
        set({
          currentBiddingTeamId: teamId,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.BID_TEAM_HIGHLIGHT,
            payload: { teamId },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Mark player as sold - CRITICAL: must dispatch event BEFORE clearing player
      markSold: (playerId, teamId, price) => {
        const eventId = generateEventId();
        set({
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.PLAYER_SOLD,
            payload: { playerId, teamId, price },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Mark player as unsold
      markUnsold: (playerId) => {
        const eventId = generateEventId();
        set({
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.PLAYER_UNSOLD,
            payload: { playerId },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Clear current player
      clearCurrentPlayer: () => {
        set({
          currentPlayerId: null,
          currentBid: 0,
          currentBiddingTeamId: null
        });
      },
      
      // View control
      setActiveView: (view) => {
        const eventId = generateEventId();
        set({
          activeView: view,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.VIEW_CHANGE,
            payload: { view },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Queue management
      setPlayerQueue: (queue) => {
        set({ playerQueue: queue, queueIndex: 0 });
      },
      
      nextInQueue: () => {
        const { playerQueue, queueIndex } = get();
        if (queueIndex < playerQueue.length - 1) {
          set({ queueIndex: queueIndex + 1 });
          return playerQueue[queueIndex + 1];
        }
        return null;
      },
      
      prevInQueue: () => {
        const { playerQueue, queueIndex } = get();
        if (queueIndex > 0) {
          set({ queueIndex: queueIndex - 1 });
          return playerQueue[queueIndex - 1];
        }
        return null;
      },
      
      // Round/tier management
      setCurrentRound: (round) => set({ currentRound: round }),
      setCurrentTier: (tier) => set({ currentTier: tier }),
      
      // Sound control
      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
      setSound: (enabled) => set({ soundEnabled: enabled }),
      
      // Pool filters
      setPoolFilter: (filter) => set({ poolFilter: filter }),
      setPoolTierFilter: (tier) => set({ poolTierFilter: tier }),
      
      // Bid increments
      setBidIncrements: (increments) => set({ bidIncrements: increments }),
      
      // Auto-increment rules for team click
      setAutoIncrementRules: (rules) => set({ autoIncrementRules: rules }),
      
      // Play sound event
      playSound: (soundId) => {
        const eventId = generateEventId();
        set({
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.SOUND_PLAY,
            payload: { soundId },
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Reset auction state only (keeps config)
      resetAuctionState: () => {
        const eventId = generateEventId();
        set({
          ...initialState,
          lastEvent: {
            id: eventId,
            type: AUCTION_EVENTS.AUCTION_RESET,
            payload: {},
            timestamp: Date.now()
          },
          lastEventId: eventId
        });
      },
      
      // Full reset
      resetAuction: () => set(initialState)
    }),
    {
      name: 'bwpl-auction-state',
      partialize: (state) => ({
        // Only persist these fields
        isLive: state.isLive,
        currentPlayerId: state.currentPlayerId,
        currentBid: state.currentBid,
        currentBiddingTeamId: state.currentBiddingTeamId,
        activeView: state.activeView,
        playerQueue: state.playerQueue,
        queueIndex: state.queueIndex,
        currentRound: state.currentRound,
        currentTier: state.currentTier,
        soundEnabled: state.soundEnabled,
        bidIncrements: state.bidIncrements,
        autoIncrementRules: state.autoIncrementRules
      })
    }
  )
);

export default useAuctionStore;
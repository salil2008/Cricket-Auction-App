import { useEffect, useCallback, useRef } from 'react';
import { useAuctionStore, usePlayerStore, useTeamStore } from '../stores';

const CHANNEL_NAME = 'bwpl-auction-sync';

export function useBroadcast(isAdmin = false) {
  const channelRef = useRef(null);
  const lastProcessedEventId = useRef(null);
  const fetchPlayers = usePlayerStore(state => state.fetchPlayers);
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  
  // Initialize channel
  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME);
    
    // Listen for messages
    channelRef.current.onmessage = (event) => {
      const { type, source, payload } = event.data;
      
      // Don't process our own messages
      if ((isAdmin && source === 'admin') || (!isAdmin && source === 'presentation')) {
        return;
      }
      
      if (type === 'STATE_SYNC') {
        // Full state sync - check if event is new
        const incomingEventId = payload.lastEventId;
        
        // Only process if event is new (or first sync)
        if (incomingEventId && incomingEventId !== lastProcessedEventId.current) {
          lastProcessedEventId.current = incomingEventId;
          
          // Apply all state at once for consistency
          useAuctionStore.setState({
            isLive: payload.isLive,
            isPaused: payload.isPaused,
            currentPlayerId: payload.currentPlayerId,
            currentBid: payload.currentBid,
            currentBiddingTeamId: payload.currentBiddingTeamId,
            activeView: payload.activeView,
            playerQueue: payload.playerQueue,
            queueIndex: payload.queueIndex,
            currentRound: payload.currentRound,
            currentTier: payload.currentTier,
            soundEnabled: payload.soundEnabled,
            lastEvent: payload.lastEvent,
            lastEventId: payload.lastEventId,
            bidIncrements: payload.bidIncrements
          });
        } else if (!incomingEventId) {
          // Legacy sync without event ID - apply anyway
          useAuctionStore.setState(payload);
        }
      } else if (type === 'EVENT') {
        // Direct event dispatch
        const incomingEventId = payload.id;
        if (incomingEventId && incomingEventId !== lastProcessedEventId.current) {
          lastProcessedEventId.current = incomingEventId;
          useAuctionStore.setState({ 
            lastEvent: payload,
            lastEventId: incomingEventId 
          });
        }
      } else if (type === 'DATA_UPDATED') {
        // Player/Team data was updated - refresh from database
        if (!isAdmin) {
          console.log('Data updated broadcast received, refreshing stores...');
          fetchPlayers();
          fetchTeams();
        }
      } else if (type === 'REQUEST_SYNC') {
        // Presentation requesting current state from admin
        if (isAdmin) {
          broadcastState();
        }
      }
    };
    
    // Presentation: request initial state and fetch data
    if (!isAdmin) {
      channelRef.current.postMessage({
        type: 'REQUEST_SYNC',
        source: 'presentation',
        timestamp: Date.now()
      });
      // Also fetch fresh data on mount
      fetchPlayers();
      fetchTeams();
    }
    
    return () => {
      channelRef.current?.close();
    };
  }, [isAdmin, fetchPlayers, fetchTeams]);
  
  // Broadcast current state
  const broadcastState = useCallback(() => {
    if (!channelRef.current) return;
    
    const state = useAuctionStore.getState();
    const syncState = {
      isLive: state.isLive,
      isPaused: state.isPaused,
      currentPlayerId: state.currentPlayerId,
      currentBid: state.currentBid,
      currentBiddingTeamId: state.currentBiddingTeamId,
      activeView: state.activeView,
      playerQueue: state.playerQueue,
      queueIndex: state.queueIndex,
      currentRound: state.currentRound,
      currentTier: state.currentTier,
      soundEnabled: state.soundEnabled,
      lastEvent: state.lastEvent,
      lastEventId: state.lastEventId,
      bidIncrements: state.bidIncrements
    };
    
    channelRef.current.postMessage({
      type: 'STATE_SYNC',
      source: isAdmin ? 'admin' : 'presentation',
      payload: syncState,
      timestamp: Date.now()
    });
  }, [isAdmin]);
  
  // Broadcast that data was updated (call after player/team changes)
  const broadcastDataUpdate = useCallback(() => {
    if (!channelRef.current) return;
    
    channelRef.current.postMessage({
      type: 'DATA_UPDATED',
      source: isAdmin ? 'admin' : 'presentation',
      timestamp: Date.now()
    });
  }, [isAdmin]);
  
  // Broadcast an event directly
  const broadcastEvent = useCallback((eventType, eventPayload) => {
    if (!channelRef.current) return;
    
    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const event = {
      id: eventId,
      type: eventType,
      payload: eventPayload,
      timestamp: Date.now()
    };
    
    channelRef.current.postMessage({
      type: 'EVENT',
      source: isAdmin ? 'admin' : 'presentation',
      payload: event,
      timestamp: Date.now()
    });
    
    // Also update local state
    useAuctionStore.setState({ lastEvent: event, lastEventId: eventId });
  }, [isAdmin]);
  
  // Auto-broadcast state changes from admin
  useEffect(() => {
    if (!isAdmin) return;
    
    const unsubscribe = useAuctionStore.subscribe(
      (state, prevState) => {
        // Use lastEventId for reliable change detection
        const shouldSync = 
          state.lastEventId !== prevState.lastEventId ||
          state.currentPlayerId !== prevState.currentPlayerId ||
          state.currentBid !== prevState.currentBid ||
          state.currentBiddingTeamId !== prevState.currentBiddingTeamId ||
          state.activeView !== prevState.activeView ||
          state.isLive !== prevState.isLive ||
          state.isPaused !== prevState.isPaused;
        
        if (shouldSync) {
          broadcastState();
        }
      }
    );
    
    return () => unsubscribe();
  }, [isAdmin, broadcastState]);
  
  return {
    broadcastState,
    broadcastEvent,
    broadcastDataUpdate
  };
}

export default useBroadcast;

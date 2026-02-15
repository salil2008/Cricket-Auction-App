import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square,
  Gavel,
  UserX,
  Monitor,
  Volume2,
  VolumeX,
  Users,
  LayoutGrid,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Keyboard,
  SkipForward,
  AlertCircle
} from 'lucide-react';
import { 
  useAuctionStore, 
  usePlayerStore, 
  useTeamStore, 
  useConfigStore,
  resetFullAuction,
  VIEWS 
} from '../../stores';
import { useBroadcast } from '../../hooks';
import { Button, Card, CardContent, Modal } from '../../components/common';
import { formatCurrency, getTierInfo, getRoleIcon, getMaxBid, canTeamAffordBid, getTeamsAffordability } from '../../utils';

const viewOptions = [
  { id: VIEWS.AUCTION, label: 'Auction', icon: Gavel },
  { id: VIEWS.TEAMS, label: 'Teams', icon: Users },
  { id: VIEWS.POOL, label: 'Pool', icon: LayoutGrid },
  { id: VIEWS.SPLASH, label: 'Splash', icon: Monitor }
];

// Format bid increment label based on value
function formatBidLabel(value) {
  if (value >= 10000000) return `+${value / 10000000}Cr`;
  if (value >= 100000) return `+${value / 100000}L`;
  if (value >= 1000) return `+${value / 1000}K`;
  return `+${value}`;
}

export default function AuctionControl() {
  const {
    isLive,
    isPaused,
    currentPlayerId,
    currentBid,
    currentBiddingTeamId,
    activeView,
    soundEnabled,
    bidIncrements,
    startAuction,
    pauseAuction,
    resumeAuction,
    endAuction,
    selectPlayer,
    updateBid,
    incrementBid,
    highlightTeam,
    markSold,
    markUnsold,
    clearCurrentPlayer,
    setActiveView,
    toggleSound,
    resetAuctionState,
    setBidIncrements,
    setAutoIncrementRules
  } = useAuctionStore();
  
  const players = usePlayerStore(state => state.players);
  const markPlayerSold = usePlayerStore(state => state.markPlayerSold);
  const markPlayerUnsold = usePlayerStore(state => state.markPlayerUnsold);
  const reAuctionPlayer = usePlayerStore(state => state.reAuctionPlayer);
  const fetchPlayers = usePlayerStore(state => state.fetchPlayers);
  
  const teams = useTeamStore(state => state.teams);
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  
  const config = useConfigStore(state => state.config);
  
  const autoIncrementRules = useAuctionStore(state => state.autoIncrementRules);
  
  const { broadcastState, broadcastDataUpdate } = useBroadcast(true);
  
  // Local state
  const [filterTier, setFilterTier] = useState('all');
  const [filterStatus, setFilterStatus] = useState('available'); // available, unsold, both
  const [searchQuery, setSearchQuery] = useState(''); // Player name search
  const [selectedTeamForSale, setSelectedTeamForSale] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showBidConfigModal, setShowBidConfigModal] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [showBulkReauctionModal, setShowBulkReauctionModal] = useState(false);
  const [showRTMModal, setShowRTMModal] = useState(false);
  const [rtmData, setRtmData] = useState(null); // { player, winningTeam, winningBid, previousTeam }
  const [manualBidValue, setManualBidValue] = useState('');
  const [customIncrements, setCustomIncrements] = useState(bidIncrements.join(', '));
  const [resetting, setResetting] = useState(false);
  const [bulkReauctioning, setBulkReauctioning] = useState(false);
  
  // Count unsold players
  const unsoldPlayers = useMemo(() => {
    return players.filter(p => p.status === 'unsold');
  }, [players]);
  
  // Get current player details
  const currentPlayer = useMemo(() => {
    if (!currentPlayerId) return null;
    return players.find(p => p.id === currentPlayerId);
  }, [currentPlayerId, players]);
  
  // Get tier config for current player
  const currentTierConfig = useMemo(() => {
    if (!currentPlayer || !config) return null;
    return config.tiers.find(t => t.id === currentPlayer.tier);
  }, [currentPlayer, config]);
  
  // Available + unsold players for queue
  const queuePlayers = useMemo(() => {
    let filtered = players.filter(p => {
      if (filterStatus === 'available') return p.status === 'available';
      if (filterStatus === 'unsold') return p.status === 'unsold';
      if (filterStatus === 'both') return p.status === 'available' || p.status === 'unsold';
      return p.status === 'available';
    });
    
    if (filterTier !== 'all') {
      filtered = filtered.filter(p => p.tier === filterTier);
    }
    
    // Name search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(query));
    }
    
    return filtered;
  }, [players, filterTier, filterStatus, searchQuery]);
  
  // Get base price for a player's tier
  const getBasePrice = (tier) => {
    const tierConfig = config?.tiers?.find(t => t.id === tier);
    return tierConfig?.basePrice || 100;
  };
  
  // Handle selecting a player for auction
  const handleSelectPlayer = (player) => {
    const basePrice = getBasePrice(player.tier);
    selectPlayer(player.id, basePrice);
    setSelectedTeamForSale(null);
    setManualBidValue('');
  };
  
  // Calculate auto-increment amount based on current bid level
  const getAutoIncrement = (currentBidAmount) => {
    if (!autoIncrementRules || autoIncrementRules.length === 0) {
      return 100; // Default fallback
    }
    for (const rule of autoIncrementRules) {
      // Handle both Infinity and null (null is what Infinity becomes after JSON serialization)
      const threshold = (rule.upTo === null || rule.upTo === Infinity) ? Infinity : rule.upTo;
      if (currentBidAmount < threshold) {
        return rule.increment || 100;
      }
    }
    // Return last rule's increment for bids beyond all thresholds
    return autoIncrementRules[autoIncrementRules.length - 1]?.increment || 250;
  };
  
  // Handle team click - highlight team AND auto-increment bid
  const handleTeamClick = (teamId) => {
    const team = teams.find(t => t.id === teamId);
    if (!team || !currentPlayerId) return;
    
    // Calculate the auto-increment amount
    const incrementAmount = getAutoIncrement(currentBid);
    const newBid = currentBid + incrementAmount;
    
    // Check if team can afford the new bid
    const affordability = canTeamAffordBid(team, newBid, config);
    
    if (affordability.canAfford) {
      // Highlight and select the team
      highlightTeam(teamId);
      setSelectedTeamForSale(teamId);
      // Auto-increment the bid
      incrementBid(incrementAmount, teamId);
    } else {
      // Still highlight the team but don't increment
      highlightTeam(teamId);
      setSelectedTeamForSale(teamId);
    }
  };
  
  // Handle bid increment with team association
  const handleBidIncrement = (amount) => {
    // Use currently highlighted team for this bid
    incrementBid(amount, currentBiddingTeamId);
  };
  
  // Handle manual bid entry
  const handleManualBidSubmit = () => {
    const value = parseInt(manualBidValue, 10);
    if (!isNaN(value) && value > 0) {
      updateBid(value, currentBiddingTeamId);
      setManualBidValue('');
    }
  };
  
  // Handle marking as sold (with RTM check)
  const handleSold = async () => {
    console.log('handleSold called', { currentPlayer, selectedTeamForSale, currentBid });
    
    if (!currentPlayer || !selectedTeamForSale) {
      console.log('Early return: missing currentPlayer or selectedTeamForSale');
      return;
    }
    
    const team = teams.find(t => t.id === selectedTeamForSale);
    console.log('Found team:', team);
    
    // Check affordability with purse reservation logic
    const affordability = canTeamAffordBid(team, currentBid, config);
    if (!affordability.canAfford) {
      alert(`Team cannot afford this bid!\n\n${affordability.reason}\n\nMax allowed bid: ${formatCurrency(affordability.maxBid, { compact: true })}`);
      return;
    }
    
    // RTM Check - only if player has previousTeamId set
    // This feature allows retained players to be matched by their previous team
    if (currentPlayer.previousTeamId && 
        currentPlayer.previousTeamId !== selectedTeamForSale) {
      const previousTeam = teams.find(t => t.id === currentPlayer.previousTeamId);
      // Check if previous team can afford using new logic
      const prevTeamAffordability = previousTeam ? canTeamAffordBid(previousTeam, currentBid, config) : null;
      if (prevTeamAffordability?.canAfford) {
        // RTM is available - show modal
        console.log('RTM triggered');
        setRtmData({
          player: currentPlayer,
          winningTeam: team,
          winningBid: currentBid,
          previousTeam
        });
        setShowRTMModal(true);
        return; // RTM modal will handle the rest
      }
    }
    
    try {
      console.log('Calling markPlayerSold...');
      // Update database first
      await markPlayerSold(currentPlayer.id, selectedTeamForSale, currentBid);
      console.log('markPlayerSold completed');
      
      // Trigger animation event
      markSold(currentPlayer.id, selectedTeamForSale, currentBid);
      console.log('Animation event triggered');
      
      // Refresh data
      console.log('Refreshing data...');
      await fetchPlayers();
      await fetchTeams();
      console.log('Data refreshed');
      
      // Notify presenter to refresh data
      broadcastDataUpdate();
      
      // Clear after delay for animation (4.5s to let presenter animation complete)
      setTimeout(() => {
        clearCurrentPlayer();
        setSelectedTeamForSale(null);
      }, 4500);
    } catch (error) {
      console.error('Error marking sold:', error);
      alert('Failed to mark player as sold: ' + error.message);
    }
  };
  
  // Handle marking as unsold
  const handleUnsold = async () => {
    if (!currentPlayer) return;
    
    try {
      await markPlayerUnsold(currentPlayer.id);
      markUnsold(currentPlayer.id);
      
      await fetchPlayers();
      broadcastDataUpdate();
      
      // Clear after delay for animation (3.5s to let presenter animation complete)
      setTimeout(() => {
        clearCurrentPlayer();
      }, 3500);
    } catch (error) {
      console.error('Error marking unsold:', error);
    }
  };
  
  // Handle re-auction of unsold player
  const handleReAuction = async (player) => {
    try {
      await reAuctionPlayer(player.id);
      await fetchPlayers();
      broadcastDataUpdate();
    } catch (error) {
      console.error('Error re-auctioning:', error);
    }
  };
  
  // Handle full auction reset
  const handleResetAuction = async () => {
    setResetting(true);
    try {
      await resetFullAuction();
      resetAuctionState();
      await fetchPlayers();
      await fetchTeams();
      broadcastDataUpdate();
      setShowResetModal(false);
    } catch (error) {
      console.error('Error resetting auction:', error);
      alert('Failed to reset auction');
    }
    setResetting(false);
  };
  
  // Handle saving custom bid increments
  const handleSaveBidIncrements = () => {
    const values = customIncrements
      .split(',')
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v) && v > 0);
    
    if (values.length > 0) {
      setBidIncrements(values);
      setShowBidConfigModal(false);
    }
  };
  
  // Open presentation window
  const openPresentation = () => {
    window.open('/present', 'bwpl-presentation', 'width=1920,height=1080');
  };
  
  // Bulk re-auction all unsold players
  const handleBulkReauction = async () => {
    setBulkReauctioning(true);
    try {
      for (const player of unsoldPlayers) {
        await reAuctionPlayer(player.id);
      }
      await fetchPlayers();
      broadcastDataUpdate();
      setShowBulkReauctionModal(false);
    } catch (error) {
      console.error('Error bulk re-auctioning:', error);
      alert('Failed to re-auction players');
    }
    setBulkReauctioning(false);
  };
  
  // Execute RTM - previous team matches the bid
  const handleRTMAccept = async () => {
    if (!rtmData) return;
    
    try {
      // Mark player sold to previous team at the winning bid
      await markPlayerSold(rtmData.player.id, rtmData.previousTeam.id, rtmData.winningBid);
      markSold(rtmData.player.id, rtmData.previousTeam.id, rtmData.winningBid);
      
      await fetchPlayers();
      await fetchTeams();
      broadcastDataUpdate();
      
      setShowRTMModal(false);
      setRtmData(null);
      
      // Clear after delay for animation
      setTimeout(() => {
        clearCurrentPlayer();
        setSelectedTeamForSale(null);
      }, 4500);
    } catch (error) {
      console.error('Error executing RTM:', error);
      alert('Failed to execute RTM');
    }
  };
  
  // Decline RTM - winning team gets the player
  const handleRTMDecline = async () => {
    if (!rtmData) return;
    
    try {
      await markPlayerSold(rtmData.player.id, rtmData.winningTeam.id, rtmData.winningBid);
      markSold(rtmData.player.id, rtmData.winningTeam.id, rtmData.winningBid);
      
      await fetchPlayers();
      await fetchTeams();
      broadcastDataUpdate();
      
      setShowRTMModal(false);
      setRtmData(null);
      
      // Clear after delay for animation
      setTimeout(() => {
        clearCurrentPlayer();
        setSelectedTeamForSale(null);
      }, 4500);
    } catch (error) {
      console.error('Error completing sale:', error);
    }
  };
  
  // Keyboard shortcuts - use refs to avoid stale closures
  const handleSoldRef = useRef();
  const handleUnsoldRef = useRef();
  
  // Keep refs updated with latest handler functions
  handleSoldRef.current = handleSold;
  handleUnsoldRef.current = handleUnsold;
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key) {
        // Space: Pause/Resume auction
        case ' ':
          e.preventDefault();
          if (isLive) {
            isPaused ? resumeAuction() : pauseAuction();
          }
          break;
          
        // Enter: Confirm sold (if team selected)
        case 'Enter':
          if (currentPlayer && selectedTeamForSale) {
            e.preventDefault();
            handleSoldRef.current?.();
          }
          break;
          
        // Escape: Clear current player / close modals
        case 'Escape':
          if (showRTMModal || showResetModal || showBidConfigModal || showKeyboardHelp || showBulkReauctionModal) {
            setShowRTMModal(false);
            setShowResetModal(false);
            setShowBidConfigModal(false);
            setShowKeyboardHelp(false);
            setShowBulkReauctionModal(false);
          } else if (currentPlayer) {
            clearCurrentPlayer();
            setSelectedTeamForSale(null);
          }
          break;
          
        // U: Mark unsold
        case 'u':
        case 'U':
          if (currentPlayer) {
            handleUnsoldRef.current?.();
          }
          break;
          
        // Number keys 1-9: Select team (by index)
        case '1': case '2': case '3': case '4': case '5':
        case '6': case '7': case '8': case '9':
          const teamIndex = parseInt(e.key) - 1;
          if (teams[teamIndex] && currentPlayer) {
            handleTeamClick(teams[teamIndex].id);
          }
          break;
          
        // Arrow Up/Down: Navigate queue
        case 'ArrowDown':
          if (queuePlayers.length > 0) {
            e.preventDefault();
            const currentIndex = currentPlayer 
              ? queuePlayers.findIndex(p => p.id === currentPlayer.id)
              : -1;
            const nextIndex = Math.min(currentIndex + 1, queuePlayers.length - 1);
            if (queuePlayers[nextIndex]) {
              handleSelectPlayer(queuePlayers[nextIndex]);
            }
          }
          break;
          
        case 'ArrowUp':
          if (queuePlayers.length > 0) {
            e.preventDefault();
            const currentIndex = currentPlayer 
              ? queuePlayers.findIndex(p => p.id === currentPlayer.id)
              : queuePlayers.length;
            const prevIndex = Math.max(currentIndex - 1, 0);
            if (queuePlayers[prevIndex]) {
              handleSelectPlayer(queuePlayers[prevIndex]);
            }
          }
          break;
          
        // Plus/Equal: Quick increment (first increment value)
        case '+':
        case '=':
          if (currentPlayer && bidIncrements[0]) {
            handleBidIncrement(bidIncrements[0]);
          }
          break;
          
        // Question mark: Show keyboard help
        case '?':
          setShowKeyboardHelp(true);
          break;
          
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLive, isPaused, currentPlayer, selectedTeamForSale, teams, queuePlayers, bidIncrements, showRTMModal, showResetModal, showBidConfigModal, showKeyboardHelp, showBulkReauctionModal]);
  
  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Auction Control</h1>
          <p className="text-gray-400 mt-1">
            {queuePlayers.length} players in queue
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Keyboard Shortcuts Help */}
          <button
            onClick={() => setShowKeyboardHelp(true)}
            className="p-3 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard className="w-5 h-5" />
          </button>
          
          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-3 rounded-lg transition-colors ${
              soundEnabled 
                ? 'bg-[var(--bwpl-primary)]/10 text-[var(--bwpl-primary)]' 
                : 'bg-white/5 text-gray-400'
            }`}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          {/* Bulk Re-auction Unsold */}
          {unsoldPlayers.length > 0 && (
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkReauctionModal(true)}
              icon={SkipForward}
              title={`Re-auction ${unsoldPlayers.length} unsold players`}
            >
              Re-auction ({unsoldPlayers.length})
            </Button>
          )}
          
          {/* Reset Button */}
          <Button 
            variant="secondary" 
            onClick={() => setShowResetModal(true)}
            icon={RotateCcw}
            title="Reset Auction"
          >
            Reset
          </Button>
          
          {/* Auction Controls */}
          {!isLive ? (
            <Button onClick={startAuction} icon={Play} size="lg">
              Start Auction
            </Button>
          ) : (
            <>
              {isPaused ? (
                <Button onClick={resumeAuction} icon={Play} variant="success" size="lg">
                  Resume
                </Button>
              ) : (
                <Button onClick={pauseAuction} icon={Pause} variant="secondary" size="lg">
                  Pause
                </Button>
              )}
              <Button onClick={endAuction} icon={Square} variant="danger" size="lg">
                End
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* View Switcher & Presentation Link */}
      <Card>
        <CardContent className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-gray-400">View:</span>
          <div className="flex gap-2">
            {viewOptions.map(view => (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  activeView === view.id
                    ? 'bg-[var(--bwpl-primary)] text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <view.icon className="w-4 h-4" />
                {view.label}
              </button>
            ))}
          </div>
          <button
            onClick={openPresentation}
            className="ml-auto flex items-center gap-2 px-4 py-2 text-sm bg-white/5 text-[var(--bwpl-primary)] rounded-lg hover:bg-white/10"
          >
            <Monitor className="w-4 h-4" />
            Open Presentation
          </button>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Player Panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden">
            {currentPlayer ? (
              <div>
                {/* Player Header */}
                <div 
                  className="p-6"
                  style={{
                    background: currentPlayer.tier === 's-class' 
                      ? 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 100%)'
                      : currentPlayer.tier === 'a-class'
                      ? 'linear-gradient(135deg, #1a1a2e 0%, #2a2a44 100%)'
                      : currentPlayer.tier === 'b-class'
                      ? 'linear-gradient(135deg, #1a1408 0%, #2d2515 100%)'
                      : currentPlayer.tier === 'c-class'
                      ? 'linear-gradient(135deg, #0a1628 0%, #1a2744 100%)'
                      : 'linear-gradient(135deg, #0a1a1a 0%, #1a2d2d 100%)'
                  }}
                >
                  <div className="flex items-start gap-6">
                    {/* Photo */}
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                      {currentPlayer.photo ? (
                        <img 
                          src={currentPlayer.photo} 
                          alt={currentPlayer.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl">
                          {getRoleIcon(currentPlayer.role)}
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`badge ${getTierInfo(currentPlayer.tier).colorClass}`}>
                          {getTierInfo(currentPlayer.tier).icon} {getTierInfo(currentPlayer.tier).name}
                        </span>
                        {currentPlayer.status === 'unsold' && (
                          <span className="badge badge-unsold">Re-auction</span>
                        )}
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-1">{currentPlayer.name}</h2>
                      <p className="text-gray-400 text-sm">
                        {currentPlayer.role} • {currentPlayer.battingStyle}
                      </p>
                      
                      {/* Quick Stats */}
                      <div className="flex gap-6 mt-4">
                        <div>
                          <p className="text-xl font-bold text-white">{currentPlayer.stats?.matches || 0}</p>
                          <p className="text-xs text-gray-400">Matches</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{currentPlayer.stats?.runs || 0}</p>
                          <p className="text-xs text-gray-400">Runs</p>
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">{currentPlayer.stats?.wickets || 0}</p>
                          <p className="text-xs text-gray-400">Wickets</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Bid Controls */}
                <CardContent>
                  {/* Current Bid Display */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Current Bid</p>
                      <p className="text-4xl font-bold text-[var(--bwpl-primary)]">
                        {formatCurrency(currentBid)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400 mb-1">Base Price</p>
                      <p className="text-xl text-gray-300">
                        {formatCurrency(getBasePrice(currentPlayer.tier))}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bid Increment Buttons */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-400">Quick Bid</span>
                      <button 
                        onClick={() => setShowBidConfigModal(true)}
                        className="text-xs text-[var(--bwpl-primary)] hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Configure
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {bidIncrements.map(amount => (
                        <Button
                          key={amount}
                          variant="secondary"
                          onClick={() => handleBidIncrement(amount)}
                          className="flex-1 min-w-[70px]"
                        >
                          {formatBidLabel(amount)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Manual Bid Entry */}
                  <div className="mb-6">
                    <label className="text-sm text-gray-400 mb-2 block">Manual Bid Entry</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                        <input
                          type="number"
                          value={manualBidValue}
                          onChange={(e) => setManualBidValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleManualBidSubmit()}
                          placeholder={currentBid.toString()}
                          className="input-field pl-7 font-mono"
                          min={1}
                        />
                      </div>
                      <Button onClick={handleManualBidSubmit} variant="secondary">
                        Set Bid
                      </Button>
                    </div>
                  </div>
                  
                  {/* Team Selection */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-400">Click team to bid:</p>
                      <span className="text-xs px-2 py-1 rounded bg-[var(--bwpl-primary)]/20 text-[var(--bwpl-primary)]">
                        Auto +₹{getAutoIncrement(currentBid).toLocaleString()}
                      </span>
                    </div>
                    
                    {/* Warning if no team can afford */}
                    {(() => {
                      const affordability = getTeamsAffordability(teams, currentBid, config);
                      if (affordability.noTeamCanAfford && currentBid > 0) {
                        return (
                          <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <span className="text-sm text-red-400">
                              No team can afford ₹{formatCurrency(currentBid, { compact: true })} bid. Consider marking as unsold or lowering the bid.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {teams.map(team => {
                        const incrementAmount = getAutoIncrement(currentBid);
                        const nextBid = currentBid + incrementAmount;
                        const affordabilityAtNext = canTeamAffordBid(team, nextBid, config);
                        const affordability = canTeamAffordBid(team, currentBid, config);
                        const maxBid = getMaxBid(team, config);
                        const isSelected = selectedTeamForSale === team.id;
                        const isHighlighted = currentBiddingTeamId === team.id;
                        const isSquadFull = affordability.isSquadFull;
                        const canAfford = affordability.canAfford;
                        const canAffordNext = affordabilityAtNext.canAfford;
                        
                        return (
                          <button
                            key={team.id}
                            onClick={() => canAfford && handleTeamClick(team.id)}
                            className={`p-3 rounded-lg border-2 transition-all text-left ${
                              isSelected
                                ? 'border-[var(--bwpl-primary)] bg-[var(--bwpl-primary)]/10'
                                : isHighlighted
                                ? 'border-white/40 bg-white/5'
                                : canAfford 
                                ? 'border-transparent bg-white/5 hover:bg-white/10 cursor-pointer'
                                : 'border-transparent bg-white/5 opacity-50 cursor-not-allowed'
                            }`}
                            title={!canAfford ? affordability.reason : `Max bid: ${formatCurrency(maxBid, { compact: true })}`}
                          >
                            <div className="flex items-center gap-3">
                              {team.logo ? (
                                <img 
                                  src={team.logo} 
                                  alt={team.shortName}
                                  className="w-10 h-10 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div 
                                  className="w-10 h-10 rounded flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                  style={{ backgroundColor: team.primaryColor }}
                                >
                                  {team.shortName?.[0]}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-white truncate font-medium">{team.shortName}</p>
                                <p className="text-xs text-gray-400">
                                  {team.players?.length || 0}/{config?.minPlayersPerTeam || 11} players
                                </p>
                                <div className="flex items-center justify-between gap-2 mt-1">
                                  <span className={`text-xs ${canAfford ? 'text-gray-400' : 'text-red-400'}`}>
                                    Purse: {formatCurrency(team.remainingPurse, { compact: true })}
                                  </span>
                                </div>
                                <div className={`text-xs mt-0.5 ${
                                  isSquadFull ? 'text-orange-400' : 
                                  !canAfford ? 'text-red-400' : 'text-green-400'
                                }`}>
                                  {isSquadFull 
                                    ? '⚠ Squad full' 
                                    : `Max: ${formatCurrency(maxBid, { compact: true })}`
                                  }
                                </div>
                              </div>
                              {!canAfford && !isSquadFull && (
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="danger"
                      onClick={handleUnsold}
                      icon={UserX}
                      size="lg"
                      className="flex-1"
                    >
                      Unsold
                    </Button>
                    <Button
                      variant="success"
                      onClick={handleSold}
                      disabled={!selectedTeamForSale}
                      icon={Gavel}
                      size="lg"
                      className="flex-1"
                    >
                      Sold{selectedTeamForSale ? ` to ${teams.find(t => t.id === selectedTeamForSale)?.shortName}` : ''}
                    </Button>
                  </div>
                </CardContent>
              </div>
            ) : (
              <CardContent className="text-center py-16">
                <Gavel className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No Player Selected</h3>
                <p className="text-gray-400">
                  Select a player from the queue to start bidding
                </p>
              </CardContent>
            )}
          </Card>
        </div>
        
        {/* Player Queue */}
        <div className="space-y-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Player Queue</h3>
                <span className="text-xs text-gray-400">{queuePlayers.length} players</span>
              </div>
              
              {/* Search */}
              <div className="mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Search player name..."
                  className="input-field text-sm py-2 w-full"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-2 mb-4">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="select-field text-sm py-1.5 flex-1"
                >
                  <option value="available">Available</option>
                  <option value="unsold">Unsold Only</option>
                  <option value="both">Available + Unsold</option>
                </select>
                <select
                  value={filterTier}
                  onChange={(e) => setFilterTier(e.target.value)}
                  className="select-field text-sm py-1.5 flex-1"
                >
                  <option value="all">All Tiers</option>
                  {config?.tiers?.map(tier => (
                    <option key={tier.id} value={tier.id}>{tier.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Queue List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <AnimatePresence>
                  {queuePlayers.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">
                      No players in queue
                    </p>
                  ) : (
                    queuePlayers.map((player, index) => {
                      const tierInfo = getTierInfo(player.tier);
                      const isSelected = player.id === currentPlayerId;
                      const isUnsold = player.status === 'unsold';
                      
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.02 }}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[var(--bwpl-primary)]/20 border border-[var(--bwpl-primary)]'
                              : 'bg-white/5 hover:bg-white/10 border border-transparent'
                          }`}
                          onClick={() => handleSelectPlayer(player)}
                        >
                          {/* Photo */}
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                            {player.photo ? (
                              <img 
                                src={player.photo} 
                                alt={player.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                {getRoleIcon(player.role)}
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white truncate">{player.name}</p>
                              {isUnsold && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                                  unsold
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">{player.role}</p>
                          </div>
                          
                          {/* Tier & Price */}
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${tierInfo.colorClass}`}>
                              {tierInfo.icon}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatCurrency(getBasePrice(player.tier), { compact: true })}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
          
          {/* Team Purses */}
          <Card>
            <CardContent>
              <h3 className="font-semibold text-white mb-4">Team Purses</h3>
              <div className="space-y-3">
                {teams.map(team => {
                  const pursePercent = team.initialPurse > 0 
                    ? Math.max(0, Math.min(100, (team.remainingPurse / team.initialPurse) * 100))
                    : 0;
                  const isNegative = team.remainingPurse < 0;
                  const maxBid = getMaxBid(team, config);
                  const isSquadFull = (team.players?.length || 0) >= (config?.maxPlayersPerTeam || 15);
                  
                  return (
                    <div key={team.id} className="flex items-center gap-3">
                      {team.logo ? (
                        <img 
                          src={team.logo} 
                          alt={team.shortName}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: team.primaryColor }}
                        >
                          {team.shortName?.[0]}
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-white">
                            {team.shortName}
                            <span className="text-gray-500 text-xs ml-1">
                              ({team.players?.length || 0}/{config?.minPlayersPerTeam || 11})
                            </span>
                          </span>
                          <span className={isNegative ? 'text-red-400' : 'text-[var(--bwpl-primary)]'}>
                            {formatCurrency(team.remainingPurse, { compact: true })}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${isNegative ? 'bg-red-500' : 'bg-[var(--bwpl-primary)]'}`}
                            style={{ width: `${pursePercent}%` }}
                          />
                        </div>
                        <div className="text-xs mt-1 text-gray-500">
                          {isSquadFull ? (
                            <span className="text-orange-400">Squad full</span>
                          ) : (
                            <span>Max bid: <span className="text-green-400">{formatCurrency(maxBid, { compact: true })}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Reset Auction Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        title="Reset Auction"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Are you sure?</p>
              <p className="text-sm text-gray-400 mt-1">
                This will reset all player statuses to available and restore all team purses to their initial values.
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowResetModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              variant="danger"
              onClick={handleResetAuction}
              loading={resetting}
              icon={RotateCcw}
              className="flex-1"
            >
              Reset Auction
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Bid Increments Config Modal */}
      <Modal
        isOpen={showBidConfigModal}
        onClose={() => setShowBidConfigModal(false)}
        title="Configure Bid Settings"
        size="md"
      >
        <div className="space-y-6">
          {/* Quick Bid Buttons */}
          <div>
            <label className="label">Quick Bid Buttons (comma-separated)</label>
            <input
              type="text"
              value={customIncrements}
              onChange={(e) => setCustomIncrements(e.target.value)}
              placeholder="100, 200, 500, 1000"
              className="input-field font-mono"
            />
            <p className="text-xs text-gray-400 mt-2">
              Values for the manual bid increment buttons
            </p>
          </div>
          
          {/* Auto-Increment Rules Info */}
          <div>
            <label className="label">Auto-Increment Rules (Team Click)</label>
            <p className="text-xs text-gray-400 mb-3">
              When you click a team button, the bid auto-increments based on these rules:
            </p>
            <div className="space-y-2 bg-white/5 rounded-lg p-3 text-sm">
              {autoIncrementRules?.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500 w-6">{idx + 1}.</span>
                  <span>Up to</span>
                  <span className="text-white font-mono">
                    {(rule.upTo === Infinity || rule.upTo === null) ? '∞' : `₹${(rule.upTo || 0).toLocaleString()}`}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span>increment by</span>
                  <span className="text-[var(--bwpl-primary)] font-mono font-semibold">
                    +₹{(rule.increment || 0).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Example: If bid is ₹350, clicking a team adds ₹10. If bid is ₹500, clicking adds ₹25.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowBidConfigModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveBidIncrements}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Keyboard Shortcuts Help Modal */}
      <Modal
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        title="Keyboard Shortcuts"
        size="sm"
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Space</kbd>
              <span className="text-gray-300">Pause/Resume</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Enter</kbd>
              <span className="text-gray-300">Confirm Sold</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">Esc</kbd>
              <span className="text-gray-300">Clear/Cancel</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">U</kbd>
              <span className="text-gray-300">Mark Unsold</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">1-9</kbd>
              <span className="text-gray-300">Select Team</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">↑↓</kbd>
              <span className="text-gray-300">Navigate Queue</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">+</kbd>
              <span className="text-gray-300">Quick Bid</span>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono">?</kbd>
              <span className="text-gray-300">This Help</span>
            </div>
          </div>
          <div className="pt-4">
            <Button onClick={() => setShowKeyboardHelp(false)} className="w-full">
              Got it!
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Bulk Re-auction Modal */}
      <Modal
        isOpen={showBulkReauctionModal}
        onClose={() => setShowBulkReauctionModal(false)}
        title="Re-auction Unsold Players"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <SkipForward className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-medium">Start Round 2?</p>
              <p className="text-sm text-gray-400 mt-1">
                This will move <strong>{unsoldPlayers.length}</strong> unsold player(s) back to "available" status for re-auction.
              </p>
            </div>
          </div>
          
          {/* Preview unsold players */}
          {unsoldPlayers.length > 0 && unsoldPlayers.length <= 10 && (
            <div className="max-h-40 overflow-y-auto space-y-1">
              {unsoldPlayers.map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm text-gray-300 py-1">
                  <span className="text-gray-500">•</span>
                  <span>{p.name}</span>
                  <span className="text-gray-500">({getTierInfo(p.tier).name})</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkReauctionModal(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleBulkReauction}
              loading={bulkReauctioning}
              icon={SkipForward}
              className="flex-1"
            >
              Re-auction All
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* RTM (Right to Match) Modal */}
      <Modal
        isOpen={showRTMModal}
        onClose={() => {}} // Prevent closing without decision
        title="Right to Match (RTM)"
        size="md"
      >
        {rtmData && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="flex items-center justify-center gap-4 mb-4">
                {/* Previous Team */}
                <div className="text-center">
                  {rtmData.previousTeam.logo ? (
                    <img 
                      src={rtmData.previousTeam.logo}
                      alt={rtmData.previousTeam.name}
                      className="w-16 h-16 rounded-xl object-cover mx-auto mb-2"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2"
                      style={{ backgroundColor: rtmData.previousTeam.primaryColor }}
                    >
                      {rtmData.previousTeam.shortName?.[0]}
                    </div>
                  )}
                  <p className="text-sm text-gray-400">Previous Team</p>
                  <p className="font-semibold text-white">{rtmData.previousTeam.shortName}</p>
                </div>
                
                <div className="text-2xl text-gray-500">⚡</div>
                
                {/* Winning Team */}
                <div className="text-center">
                  {rtmData.winningTeam.logo ? (
                    <img 
                      src={rtmData.winningTeam.logo}
                      alt={rtmData.winningTeam.name}
                      className="w-16 h-16 rounded-xl object-cover mx-auto mb-2"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2"
                      style={{ backgroundColor: rtmData.winningTeam.primaryColor }}
                    >
                      {rtmData.winningTeam.shortName?.[0]}
                    </div>
                  )}
                  <p className="text-sm text-gray-400">Winning Bid</p>
                  <p className="font-semibold text-white">{rtmData.winningTeam.shortName}</p>
                </div>
              </div>
              
              <p className="text-gray-300 mb-2">
                <strong>{rtmData.player.name}</strong> was previously with <strong>{rtmData.previousTeam.name}</strong>
              </p>
              <p className="text-2xl font-bold text-[var(--bwpl-primary)]">
                {formatCurrency(rtmData.winningBid)}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Does {rtmData.previousTeam.name} want to match this bid?
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="danger"
                onClick={handleRTMDecline}
                className="flex-1"
              >
                No RTM → {rtmData.winningTeam.shortName}
              </Button>
              <Button 
                variant="success"
                onClick={handleRTMAccept}
                className="flex-1"
              >
                RTM → {rtmData.previousTeam.shortName}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}